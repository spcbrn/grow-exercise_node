const axios = require('axios')
    , ejs = require('ejs');

module.exports = {
  getCharacterList: async (req, res) => {
    let sortMethods = {
      default: list => list,
      name: list => list.sort((a, b) => {
                      return a.name.charCodeAt(0) === b.name.charCodeAt(0)
                               ? a.name.charCodeAt(1) === b.name.charCodeAt(1)
                                   ? a.name.charCodeAt(2) - b.name.charCodeAt(2)
                                   : a.name.charCodeAt(1) - b.name.charCodeAt(1)
                               : a.name.charCodeAt(0) - b.name.charCodeAt(0);
                    }),
      mass: list => list.sort((a, b) => a.mass - b.mass),
      height: list => list.sort((a, b) => a.height - b.height)
    }
    let sortBy = sortMethods[req.query.sort] ? req.query.sort : 'default';

    const accumResults = async (sort) => {
      let characters = [];
      let pageCount = 1;
      while (characters.length < 50) {
        await axios.get(`https://swapi.co/api/people/?page=${pageCount}`)
        .then(resp => characters = [...characters, ...resp.data.results])
        pageCount++;
      }
      return sortMethods[sort](characters)
    };

    let characterList = await accumResults(sortBy);
    res.status(200).send(characterList)
  },
  getCharacter: (req, res) => {
    let { name } = req.params;
    axios.get(`https://swapi.co/api/people/?search=${name}`)
      .then(async resp => {
        let { name, height, mass, gender, homeworld } = resp.data.results[0];
        let homeworldName = await axios.get(homeworld).then(resp => resp.data.name);
        let characterMarkup = ejs.render(`
            <h2><%= name %></h2>
            <ul>
              <li>Height: <%= height %></li>
              <li>Mass: <%= mass %></li>
              <li>Gender: <%= gender %></li>
              <li>Homeworld: <%= homeworldName %></li>
            </ul>
          `, { name, height, mass, gender, homeworldName })

        res.status(200).send(characterMarkup)
      })
  },
  getPlanetResidents: (req, res) => {
    console.log('/planetresidents');
    res.status(200).send('Planet residents endpoint.')
  }
}
