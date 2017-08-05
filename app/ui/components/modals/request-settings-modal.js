import React, {PropTypes, PureComponent} from 'react';
import autobind from 'autobind-decorator';
import Modal from '../base/modal';
import ModalBody from '../base/modal-body';
import ModalHeader from '../base/modal-header';
import HelpTooltip from '../help-tooltip';
import * as models from '../../../models';
import {trackEvent} from '../../../analytics/index';
import DebouncedInput from '../base/debounced-input';
import MarkdownEditor from '../markdown-editor';


import Dropdown from '../base/dropdown/dropdown';
import DropdownButton from '../base/dropdown/dropdown-button';
import DropdownItem from '../base/dropdown/dropdown-item';
import DropdownDivider from '../base/dropdown/dropdown-divider';

@autobind
class RequestSettingsModal extends PureComponent {
  constructor (props) {
    super(props);
    this.state = {
      request: null,
      workspaceMap: {},
      workspaces: [],
      showDescription: false,
      defaultPreviewMode: false
    };
  }

  componentDidMount () {
    this._loadWorkspaces();
  }

  async _loadWorkspaces () {
    const workspaces = await models.workspace.all();
    let workspaceMap = {};
    workspaces.forEach((workspace) => {
      workspaceMap[workspace._id] = workspace
    });
    this.setState({
      workspaces,
      workspaceMap
    });
  }

  _setModalRef (n) {
    this.modal = n;
  }

  _setEditorRef (n) {
    this._editor = n;
  }

  async _updateRequestSettingBoolean (e) {
    const value = e.target.checked;
    const setting = e.target.name;
    const request = await models.request.update(this.state.request, {[setting]: value});
    this.setState({request});
    trackEvent('Request Settings', setting, value ? 'Enable' : 'Disable');
  }

  async _handleNameChange (name) {
    const request = await models.request.update(this.state.request, {name});
    this.setState({request});
  }

  async _handleDescriptionChange (description) {
    const request = await models.request.update(this.state.request, {description});
    this.setState({request, defaultPreviewMode: false});
  }

  _handleAddDescription () {
    trackEvent('Request', 'Add Description');
    this.setState({showDescription: true});
  }

  async _handleChangeWorkspace (workspace) {
    const parentId = workspace._id;
    const request = await models.request.update(this.state.request, {parentId});
    this.setState({request});
  }

  show ({request, forceEditMode}) {
    this.modal.show();
    const hasDescription = !!request.description;

    this.setState({
      request,
      showDescription: forceEditMode || hasDescription,
      defaultPreviewMode: hasDescription && !forceEditMode
    });

    if (forceEditMode) {
      setTimeout(() => {
        this._editor.focus();
      }, 400);
    }
  }

  hide () {
    this.modal.hide();
  }

  renderCheckboxInput (setting) {
    return (
      <input
        type="checkbox"
        name={setting}
        checked={this.state.request[setting]}
        onChange={this._updateRequestSettingBoolean}
      />
    );
  }

  renderModalBody (request) {
    const {
      editorLineWrapping,
      editorFontSize,
      editorIndentSize,
      editorKeyMap,
      handleRender,
      handleGetRenderContext
    } = this.props;

    const {showDescription, defaultPreviewMode, workspaceMap} = this.state;
    let {workspaces} = this.state
    workspaces = workspaces.filter(function(workspace){
      return workspace._id != request.parentId;
    });
    const workspace = workspaceMap[request.parentId];
    return (
      <div>
        <div className="form-control form-control--outlined">
          <label>Name
            {' '}
            <span className="txt-sm faint italic">
              (also rename by double-clicking in sidebar)
            </span>
            <DebouncedInput
              delay={500}
              type="text"
              placeholder="My Request"
              defaultValue={request.name}
              onChange={this._handleNameChange}
            />
          </label>
        </div>
        {showDescription ? (
          <MarkdownEditor
            ref={this._setEditorRef}
            className="margin-top"
            defaultPreviewMode={defaultPreviewMode}
            fontSize={editorFontSize}
            indentSize={editorIndentSize}
            keyMap={editorKeyMap}
            placeholder="Write a description"
            lineWrapping={editorLineWrapping}
            handleRender={handleRender}
            handleGetRenderContext={handleGetRenderContext}
            defaultValue={request.description}
            onChange={this._handleDescriptionChange}
          />
        ) : (
          <button onClick={this._handleAddDescription}
                  className="btn btn--outlined btn--super-duper-compact">
            Add Description
          </button>
        )}
        <div className="form-control form-control--outlined">
          <label>Workspace
            {' '}
            <Dropdown key="workspace" outline>
              <DropdownButton className="btn btn--clicky">
                {workspace.name} <i className="fa fa-caret-down"/>
              </DropdownButton>
              <DropdownDivider>Change to Other Workspace</DropdownDivider>
              {
                workspaces.map((workspace) => {
                  return (
                    <DropdownItem key={workspace._id} value={workspace._id} onClick={() => this._handleChangeWorkspace(workspace)}>
                      {workspace.name}
                    </DropdownItem>
                  )
                })
              }
            </Dropdown>
          </label>
        </div>
        <div className="pad-top">
          <div className="form-control form-control--thin">
            <label>Send cookies automatically
              {this.renderCheckboxInput('settingSendCookies')}
            </label>
          </div>
          <div className="form-control form-control--thin">
            <label>Store cookies automatically
              {this.renderCheckboxInput('settingStoreCookies')}
            </label>
          </div>
          <div className="form-control form-control--thin">
            <label>Automatically encode special characters in URL
              {this.renderCheckboxInput('settingEncodeUrl')}
              <HelpTooltip position="top" className="space-left">
                Automatically encode special characters at send time (does not apply to
                query parameters editor)
              </HelpTooltip>
            </label>
          </div>
          <div className="form-control form-control--thin">
            <label>Skip rendering of request body
              {this.renderCheckboxInput('settingDisableRenderRequestBody')}
              <HelpTooltip position="top" className="space-left">
                Disable rendering of environment variables and tags for the request body
              </HelpTooltip>
            </label>
          </div>
        </div>
      </div>
    );
  }

  render () {
    const {request} = this.state;
    return (
      <Modal ref={this._setModalRef} freshState>
        <ModalHeader>
          Request Settings
          {' '}
          <span className="txt-sm selectable faint monospace">{request ? request._id : ''}</span>
        </ModalHeader>
        <ModalBody className="pad">
          {request ? this.renderModalBody(request) : null}
        </ModalBody>
      </Modal>
    );
  }
}

RequestSettingsModal.propTypes = {
  editorFontSize: PropTypes.number.isRequired,
  editorIndentSize: PropTypes.number.isRequired,
  editorKeyMap: PropTypes.string.isRequired,
  editorLineWrapping: PropTypes.bool.isRequired,
  handleRender: PropTypes.func.isRequired,
  handleGetRenderContext: PropTypes.func.isRequired
};

export default RequestSettingsModal;
