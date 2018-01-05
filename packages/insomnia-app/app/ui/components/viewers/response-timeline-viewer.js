import React, {PureComponent} from 'react';
import PropTypes from 'prop-types';
import {shell, remote} from 'electron';
import CodeEditor from '../codemirror/code-editor';
import Button from '../base/button';
import moment from 'moment';
import path from 'path';
import fs from 'fs';
import {trackEvent} from '../../../common/analytics';

class ResponseTimelineViewer extends PureComponent {
  _handleClickLink (link) {
    shell.openExternal(link);
  }

  renderRow (row) {
    const {name, value} = row;

    let prefix = null;
    switch (name) {
      case 'HEADER_IN':
        prefix = '< ';
        break;
      case 'DATA_IN':
        prefix = '| ';
        break;
      case 'SSL_DATA_IN':
        prefix = '<< ';
        break;
      case 'HEADER_OUT':
        prefix = '> ';
        break;
      case 'DATA_OUT':
        prefix = '| ';
        break;
      case 'SSL_DATA_OUT':
        prefix = '>> ';
        break;
      case 'TEXT':
        prefix = '* ';
        break;
    }

    if (prefix !== null) {
      const lines = (value + '').replace(/\n$/, '').split('\n');
      const newLines = lines
        .filter(l => !l.match(/^\s*$/))
        .map(l => `${prefix}${l}`);
      return newLines.join('\n');
    } else {
      return null;
    }
  }

  _handleExport () {
    console.log("export");
    const contentType = 'text/plain';

    const extension = 'txt';
    const lastDir = window.localStorage.getItem('insomnia.lastExportPath');
    const dir = lastDir || remote.app.getPath('downloads');
    const date = moment().format('YYYY-MM-DD');
    const filename = `timeline_${date}`;
    const options = {
      title: 'Save as File',
      buttonLabel: 'Save',
      defaultPath: path.join(dir, filename),
      filters: [{
        name: 'Download', extensions: [extension]
      }]
    };
    const {timeline} = this.props;
    const rows = timeline.map(this.renderRow).filter(r => r !== null).join('\n');

    remote.dialog.showSaveDialog(options, outputPath => {
      if (!outputPath) {
        trackEvent('Response', 'Timeline Save Cancel');
        return;
      }

      // Remember last exported path
      window.localStorage.setItem('insomnia.lastExportPath', path.dirname(filename));

      // Save the file
      fs.writeFile(outputPath, rows, err => {
        if (err) {
          console.warn('Failed to save timeline to file', err);
          trackEvent('Response', 'Timeline Save Failure');
        } else {
          trackEvent('Response', 'Timeline Save Success');
        }
      });
    });
  }

  render () {
    const {timeline, editorFontSize, editorIndentSize, editorLineWrapping} = this.props;
    const rows = timeline.map(this.renderRow).filter(r => r !== null).join('\n');
    return (
      <div className="scrollable editor">
        <button className="btn-export-timeline" onClick={this._handleExport.bind(this)}>
          <span title="Export timeline"><i className="fa fa-download"/></span>
        </button>
        <CodeEditor
          hideLineNumbers
          readOnly
          onClickLink={this._handleClickLink}
          defaultValue={rows}
          fontSize={editorFontSize}
          indentSize={editorIndentSize}
          lineWrapping={editorLineWrapping}
          className="pad-left"
          mode="curl"
        />
      </div>
    );
  }
}

ResponseTimelineViewer.propTypes = {
  timeline: PropTypes.array.isRequired,
  editorFontSize: PropTypes.number.isRequired,
  editorIndentSize: PropTypes.number.isRequired,
  editorLineWrapping: PropTypes.bool.isRequired
};

export default ResponseTimelineViewer;
