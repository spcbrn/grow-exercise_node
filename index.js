
//------------DEPENDENCIES------------//

const express = require('express')
    , path = require('path')
    , cors = require('cors')
    , bodyParser = require('body-parser')
    , services = require('./services')
    , port = 8089;

const app = express();

//---------INITIALIZE SERVER----------//

/*
I recently began using a pure function approach to initializing a server,
so in this case there is a function into which we pass whatever dependencies/variables
are needed for each module (authentication, db connection, websockets, graphql etc...)
For this server we need only a REST module to implement our endpoints
*/
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
