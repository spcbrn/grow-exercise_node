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
      .then(async resp1 => {
        //Pull relevant data off of the response object
        let { name, height, mass, gender, homeworld } = resp1.data.results[0];
        //Using the homeworld endpoint URL provided from the first request, make a blocking request
        //to retrieve the name of the character's homeworld, storing it to a variable.
        let homeworldName = await axios.get(homeworld).then(resp2 => resp2.data.name);
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
    const processResidents = async (hash, planets) => {
      for (let key in hash) {
        if (!hash[key]) hash[key] = await axios.get(key)
                                            .then(resp1 => resp1.data.name)
                                            .catch(err => res.status(500).send(err));
      }
      if (planets) {
        for (let key in planets) {
          if (planets[key].length) planets[key] = planets[key].map(c1 => hash[c1]);
        }
        return planets;
      }
    }

    //a function to make non-blocking requests for information about each resident
    //(the idea is that we can start to get residents' data while we are still accumulating all of the
    //planets)
    const preloadResident = url => {
      axios.get(url)
        .then(resp1 => residentHash[url] = resp1.data.name)
        .catch(err => res.status(500).send(err));
    }

    //a function to make consecutive blocking requests to the API until we have all of the planet objects
    const processPlanets = async () => {
      let nexturl = 'https://swapi.co/api/planets/?page=1';
      let planetCensus = {};
      //as long as the current result offers a valid `next` paginated url, we will use it for our next request
      while (nexturl) {
        await axios.get(nexturl).then(async resp1 => {
          let { next, results } = resp1.data;
          nexturl = next;
          //after pulling off the planet list (results) and re-assigning `nexturl`, loop through each planet,
          //and map it's residents' addresses to a property on our census object that matches the planet's name
          for (let i = 0; i < results.length; i++) {
            planetCensus[results[i].name] = results[i].residents.map(c1 => {
              //create a hash property that matches the current resident's address (c1)
              residentHash[c1] = 0;
              //send an asyncronous request to get the current resident (c1) and store their name in our hash
              preloadResident(c1);
              //return the resident's address to the planet's residents array
              return c1;
            });
          }
        })
        .catch(err => res.status(500).send(err));
      }
      //run the accumulated list of planets through final processing to ensure each resident's name is listed
      let finalCensus = await processResidents(residentHash, planetCensus);
      return finalCensus;
    }

    let results = await processPlanets();
    res.status(200).send(results)

  }
};
