
/*
The REST module is a decorator function into which we pass our app (and other deps/parameters if needed)
and which contains our endpoints.
Request handling is deferred to the appropriate controller (in this case just one REST controller)
*/
module.exports = (app, path) => {
  const restCtrl = require('./restController');

  app.get('/characters', restCtrl.getCharacterList);
  app.get('/character/:name', restCtrl.getCharacter);
  app.get('/planetresidents', restCtrl.getPlanetResidents);

  //A fallback endpoint to serve up a predictable response to invalid requests.
  app.get('/*', (req, res) => res.status(500).send('Try \'/characters (/?sort=name/mass/height)\', \'/character/:name\' or \'/planetresidents\'.'));

  console.log('REST endpoints initialized')
}
