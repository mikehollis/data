import {RESTAdapter} from "ember-data/adapters";
import {InvalidError} from "ember-data/system/adapter";
import {pluralize} from "ember-inflector";

/**
  @module ember-data
*/

var decamelize = Ember.String.decamelize;
var underscore = Ember.String.underscore;

/**
  The `DS.ActiveModelAdapter` is a subclass of the `DS.RESTAdapter` designed to integrate
  with a JSON API that works with the
  [active\_model\_serializers](http://github.com/rails-api/active_model_serializers)
  Ruby gem. Therefore, when using this adapter, there are some differences with the default
  types of keys that should be used (explained below).

  ## Rails Configuration

  This Adapter expects specific settings using ActiveModel::Serializers,
  `embed :ids, embed_in_root: true` which sideloads the records.

  ## JSON Structure

  The ActiveModel Adapter expects the JSON returned from your server to follow the REST
  Adapter's conventions with the following exceptions.

  ### Object Root

  The ActiveModel Adapter is almost the same as the REST Adapter for the
  object root. The only difference is that the keys are underscored instead of camelCased.

  ### Conventional Names

  While the `DS.RESTAdapter` uses camelCasing, the `DS.ActiveModelAdapter` using underscoring.

  For example, if you have a `Person` model:

  ````js
  App.Person = DS.Model.extend({
    firstName: DS.attr('string'),
    lastName: DS.attr('string'),
    occupation: DS.attr('string')
  });
  ```

  In the `DS.RESTAdapter`, the JSON should look like this:

  ````js
  {
    "person": {
      "id": 5,
      "firstName": "Barack",
      "lastName": "Obama",
      "occupation": "President"
    }
  }
  ```

  Whereas in the `DS.ActiveModelAdapter`, the JSON should look like this:

  ````js
  {
    "person": {
      "id": 5,
      "first_name": "Barack",
      "last_name": "Obama",
      "occupation": "President"
    }
  }
  ```

  ### Relational Keys

  It's important to note that ActiveModel::Serializer expects relationships to be
  serialized as ids only, and the key uses the `_id` extension. Therefore, if we
  change the occupation to be a separate model and add a `familyMembers` relationship:

  ````js
  App.Person = DS.Model.extend({
    firstName: DS.attr('string'),
    lastName: DS.attr('string'),
    occupation: DS.belongsTo('occupation', {async: true}),
    familyMembers: DS.hasMany('family-member', {async:true})
  });

  App.Occupation = DS.Model.extend({
    name: DS.attr('string'),
    salary: DS.attr('number'),
    people: DS.hasMany('person', {async: true})
  });
  ```

  the resulting JSON payload for the `DS.ActiveModelAdapter` would need to be this:

  ````js
  {
    "people": [{
      "id": 5,
      "first_name": "Barack",
      "last_name": "Obama",
      "occupation_id": 1
      "family_member_ids": [1,2,3]
    }],

    "occupations": [{
      "id": 1,
      "name": "President",
      "salary": "400000",
      "people_ids": [5]
    }]
  }
  ```

  @class ActiveModelAdapter
  @constructor
  @namespace DS
  @extends DS.RESTAdapter
**/

var ActiveModelAdapter = RESTAdapter.extend({
  defaultSerializer: '-active-model',
  /**
    The ActiveModelAdapter overrides the `pathForType` method to build
    underscored URLs by decamelizing and pluralizing the object type name.

    ```js
      this.pathForType("famousPerson");
      //=> "famous_people"
    ```

    @method pathForType
    @param {String} modelName
    @return String
  */
  pathForType: function(modelName) {
    var decamelized = decamelize(modelName);
    var underscored = underscore(decamelized);
    return pluralize(underscored);
  },

  /**
    The ActiveModelAdapter overrides the `ajaxError` method
    to return a DS.InvalidError for all 422 Unprocessable Entity
    responses.

    A 422 HTTP response from the server generally implies that the request
    was well formed but the API was unable to process it because the
    content was not semantically correct or meaningful per the API.

    For more information on 422 HTTP Error code see 11.2 WebDAV RFC 4918
    https://tools.ietf.org/html/rfc4918#section-11.2

    @method ajaxError
    @param {Object} jqXHR
    @return error
  */
  ajaxError: function(jqXHR) {
    var error = this._super.apply(this, arguments);

    if (jqXHR && jqXHR.status === 422) {
      var response = Ember.$.parseJSON(jqXHR.responseText);
      return new InvalidError(response);
    } else {
      return error;
    }
  }
});

export default ActiveModelAdapter;
