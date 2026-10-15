import attachmentFetch from './commands/attachment/fetch';
import attachmentSave from './commands/attachment/save';
import documentFetch from './commands/document/fetch';
import documentSave from './commands/document/save';
import entityList from './commands/entity/list';
import login from './commands/login';
import logout from './commands/logout';
import propertyList from './commands/property/list';
import recordDelete from './commands/record/delete';
import recordFetch from './commands/record/fetch';
import recordGet from './commands/record/get';
import recordSave from './commands/record/save';
import viewFieldList from './commands/view-field/list';
import viewList from './commands/view/list';

export const commands = {
  login,
  logout,
  'entity list': entityList,
  'property list': propertyList,
  'view list': viewList,
  'view-field list': viewFieldList,
  'record fetch': recordFetch,
  'record get': recordGet,
  'record save': recordSave,
  'record delete': recordDelete,
  'attachment fetch': attachmentFetch,
  'attachment save': attachmentSave,
  'document fetch': documentFetch,
  'document save': documentSave,
};
