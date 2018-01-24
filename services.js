module.exports = {
  init: {
    /*
    This is a method that decorates our server app with our rest module
    */
    load_app_module_rest: (app, path) => {
      const restModule = require('./rest/restModule');
      restModule(app, path);
    }
  }
}
