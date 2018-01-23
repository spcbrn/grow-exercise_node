module.exports = (app, path) => {
  const restCtrl = require('./restController');

  app.get('/characters', restCtrl.getCharacterList);
  app.get('/character/:name', restCtrl.getCharacter);
  app.get('/planetresidents', restCtrl.getPlanetResidents);

  app.get('*', (req, res) => res.status(500).send('No resources found.'));

  console.log('REST endpoints initialized')
}
