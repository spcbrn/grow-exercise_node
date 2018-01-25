const axios = require('axios')
    , ejs = require('ejs');

module.exports = {
     ///////////////////////////////////////////////////
  /* getCharacterList serves the '/characters' endpoint */
     ///////////////////////////////////////////////////
  getCharacterList: async (req, res) => {
    //pull the value of the `sort` query string off of the query object and store it (or undefined)
    let { sort } = req.query;
    //sort methods based on different query parameters, leveraging the Array.Prototype.sort() method,
    //going 3 characters deep for name-based sorting.
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
    //create a string variable to match the appropriate sortMethods key
    let sortKey = sortMethods[sort] ? sort : 'default';

    //accumResults is an asynchronous function which will take in the desired sorting parameter, and make
    //blocking, paginated calls to the API to accumulate 50 character objects
    //once >=50 objects have been accumulated, it will apply a sort method if necessary and return the first 50
    const accumResults = async key => {
      let characters = [];
      let pageCount = 1;
      while (characters.length < 50) {
        await axios.get(`https://swapi.co/api/people/?page=${pageCount}`)
          .then(resp => characters = [...characters, ...resp.data.results])
          .catch(err => res.status(500).send(err))
        pageCount++;
      }
      return sortMethods[key](characters.splice(0, 50))
    };

    let characterList = await accumResults(sortKey);
    res.status(200).send(characterList)
  },
     ////////////////////////////////////////////////////
  /* getCharacter serves the '/character/:name' endpoint */
    ////////////////////////////////////////////////////
  getCharacter: (req, res) => {
    //Pull the `name` param off of the params object.
    let { name } = req.params;
    //Make a request to the people endpoint, passing along the `name` param as a `search` query.
    axios.get(`https://swapi.co/api/people/?search=${name}`)
      .then(async character => {
        //Pull relevant data off of the response object
        let { name, height, mass, gender, homeworld } = character.data.results[0];
        //Using the homeworld endpoint URL provided from the first request, make a blocking request
        //to retrieve the name of the character's homeworld, storing it to a variable.
        let homeworldName = await axios.get(homeworld).then(planet => planet.data.name);
        //Generate a basic view using EJS with response data from our API calls, and send it to the client.
        let characterMarkup = ejs.render(`
            <h2><%= name %></h2>
            <ul>
              <li>Height: <%= height %></li>
              <li>Mass: <%= mass %></li>
              <li>Gender: <%= gender %></li>
              <li>Homeworld: <%= homeworldName %></li>
            </ul>`,
            { name, height, mass, gender, homeworldName }
        )

        res.status(200).send(characterMarkup)
      })
      .catch(err => res.status(500).send(err))
  },
      ///////////////////////////////////////////////////
  /* getCharacter serves the '/planetresidents' endpoint */
     ///////////////////////////////////////////////////
  getPlanetResidents: async (req, res) => {
    //create a hash to store residents' API addresses and names
    let residentHash = {};

    //a function to make a final run through each planet and ensure all residents' names are listed
    //if lazy-loading the residents isn't complete at the time of invokation, make blocking requests
    //to populate the rest of the hash, then map the residents' names to their respective planets
    const processResidents = async (residents, planets) => {
      for (let address in residents) {
        if (!residents[address]) residents[address] = await axios.get(address)
                                            .then(resident => resident.data.name)
                                            .catch(err => res.status(500).send(err));
      }
      if (planets) {
        for (let name in planets) {
          if (planets[name].length) planets[name] = planets[name].map(adress => residents[adress]);
        }
        return planets;
      }
    }

    //a function to make non-blocking requests for information about each resident
    //(start to get residents' data while we are still accumulating all of the planets)
    const preloadResident = address => {
      axios.get(address)
        .then(resident => residentHash[address] = resident.data.name)
        .catch(err => res.status(500).send(err));
    }

    //a function to make consecutive blocking requests to the API until we have all of the planet objects
    const processPlanets = async () => {
      let nexturl = 'https://swapi.co/api/planets/?page=1';
      let planetCensus = {};
      //as long as the current result offers a valid `next` paginated url, we will use it for our next request
      while (nexturl) {
        await axios.get(nexturl).then(async planet => {
          let { next, results } = planet.data;
          nexturl = next;
          //after pulling off the planet list (results) and re-assigning `nexturl`, loop through each planet,
          //and map it's residents' addresses to a property on our census object that matches the planet's name
          for (let i = 0; i < results.length; i++) {
            planetCensus[results[i].name] = results[i].residents.map(address => {

              residentHash[address] = 0;

              preloadResident(address);
              //return the resident's address to the planet's residents array
              return address;
            });
          }
        })
        .catch(err => res.status(500).send(err));
      }
      //run the accumulated list of planets through final processing to ensure each resident's name is listed
      let finalCensus = await processResidents(residentHash, planetCensus);
      return finalCensus;
    }

    let residentsByPlanet = await processPlanets();
    res.status(200).send(residentsByPlanet)

  }
};
