
//------------DEPENDENCIES------------//

const express = require('express')
    , path = require('path')
    , cors = require('cors')
    , bodyParser = require('body-parser')
    , services = require('./services')
    , port = 8009;

const app = express();

//---------INITIALIZE SERVER----------//

const initialize_web_server = async (app, path, port) => {
    const {

      //----------------REST----------------//

      load_app_module_rest

    } = services.init;

  //---------------SET UP---------------//

  app.listen(port, () => console.log(`serving port ${port}`));
  app.use(cors());

  load_app_module_rest(app, path);
};

//----------------START---------------//

initialize_web_server(app, path, port);
