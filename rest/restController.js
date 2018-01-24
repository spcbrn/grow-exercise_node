const axios = require('axios')
    , ejs = require('ejs');

module.exports = {
  /*
  The getCharacterList method serves the '/characters' endpoint, and it's purpose is to return
  an array (raw JSON) of 50 characters, optionally sorted by the characters' `name`, `mass` or
  `height` values.
  */
  getCharacterList: async (req, res) => {
    //Pull the value of the `sort` query string off of the query object.
    //If no `sort` query was sent, the value will be undefined
    let { sort } = req.query;
    //sortMethods is a module of sort methods based on different query parameters, leveraging the built-
    //in Array.Prototype.sort() method, going 3 characters deep for name-based sorting.
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
    //sortQuery is a string that matches the appropriate sortMethods key, depending on which,
    //if any, 'sort' query was sent in the request.
    //Basically, if it exists on the sortMethods object, it's good, and if not (including undefined),
    //set it to 'default' (no sorting).
    let sortKey = sortMethods[sort] ? sort : 'default';

    //accumResults is an asynchronous function which will take in the desired sorting parameter, and make
    //blocking, paginated calls to the API to accumulate 50 character objects.
    //Once 50 objects have been accumulated, it will sort them (or not) based on the query and return
    //them in an array.
    const accumResults = async sortKey => {
      let characters = [];
      let pageCount = 1;
      while (characters.length < 50) {
        await axios.get(`https://swapi.co/api/people/?page=${pageCount}`)
          .then(resp => characters = [...characters, ...resp.data.results])
          .catch(err => res.status(500).send(err))
        pageCount++;
      }
      return sortMethods[sortKey](characters)
    };

    //Here we declare a variable to hold our sorted list of characters, and send them to the client
    let characterList = await accumResults(sortKey);
    res.status(200).send(characterList)
  },
  /*
  The getCharacter method serves the '/character/:name' endpoint, and it's purpose is to return a basic
  EJS view containing information about a given character.
  */
  getCharacter: (req, res) => {
    //Pull the `name` param off of the params object.
    let { name } = req.params;
    //Make a request to the people endpoint, passing along the `name` param as a `search` query.
    axios.get(`https://swapi.co/api/people/?search=${name}`)
      .then(async resp => {
        //Pull relevant data off of the response object
        let { name, height, mass, gender, homeworld } = resp.data.results[0];
        //Using the homeworld endpoint URL provided from the first request, make a blocking request
        //to retrieve the name of the character's homeworld, storing it to a variable.
        let homeworldName = await axios.get(homeworld).then(resp => resp.data.name);
        //Generate a basic view using EJS with response data from our API calls, and send it to the client.
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
      .catch(err => res.status(500).send(err))
  },
  getPlanetResidents: async (req, res) => {
    const getPlanets = async () => {
      let planets;
      await axios.get(`https://swapi.co/api/planets/?page=1`)
        .then(async resp => {
          let next = resp.data.next;
          planets = resp.data.results;
          while (next) {
            await axios.get(next)
              .then(resp => {
                planets = [...planets, ...resp.data.results];
                next = resp.data.next;
              })
              .catch(err => res.status(500).send(err))
          }
        })
        .catch(err => res.status(500).send(err))
      return planets.map(c => {
        let planetObj = {};
        planetObj.name = c.name;
        planetObj[c.name] = [];
        planetObj.residents = c.residents;
        return planetObj;
      });
    }
    const addResidents = async planets => {
      let residentHash = {};
      let populatedPlanets = await planets.map(c => {
        let residentNames = [];
        if (c.residents.length) {
          c.residents.forEach(async url => {
            if (residentHash[url]) {
              residentNames.push(residentHash[url]);
              return;
            } else {
              await axios.get(url)
              .then(resp => {
                console.log(url)
                residentNames.push(resp.data.name);
                residentHash[url] = resp.data.name;
              })
            }
          })
        }
        c[c.name] = residentNames;
        delete c.name;
        delete c.residents;
        return c;
      })
      return populatedPlanets;
    }
    let planetList = await addResidents(await getPlanets())
    res.status(200).send(planetList)
  }
}
