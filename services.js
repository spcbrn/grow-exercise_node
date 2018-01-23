module.exports = {
  init: {
    load_app_module_rest: (app, path) => {
      const restModule = require('./rest/restModule');
      restModule(app, path);
    }
  }
}
