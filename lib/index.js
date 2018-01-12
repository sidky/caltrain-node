var request = require('request-promise');
const util = require('util');

const HOST_NAME = 'http://api.511.org/transit';
const CALTRAIN_CODE = 'CT';

const LineType = {
    LOCAL: 'Local',
    LIMITED: 'Limited',
    BULLET: 'Baby Bullet'
};

const Direction = {
    NORTH: 'N',
    SOUTH: 'S'
};

class Location {
    constructor(longitude, latitude) {
        this.longitude = longitude;
        this.latitude = latitude;
    }
};

class StopPlace {
    constructor(id, name, location, public_code, direction) {
        this.id = id;
        this.name = name;
        this.location = location;
        this.public_code = public_code;
        this.direction = direction;
    }
};

class CaltrainApi {
    constructor(api_key) {
        this.api_key = api_key;
    }

    query_common() {
        return {
            api_key: this.api_key,
            operator_id: CALTRAIN_CODE,
            format: 'json'
        };
    }

    api_common(){
        return {
            qs: this.query_common(),
            json: true,
            gzip: true
        }
    }

    api_lines() { return this._extend(this.api_common(), { uri: `${HOST_NAME}/lines` }); }
    api_stop_places() { return this._extend(this.api_common(), { uri: `${HOST_NAME}/stopPlaces`}); }

    api_path(url, extra_query) {
        var url_object = { url: url }
        var query_object = { qa: extra_query }
        return _extend(this.api_common(), url_object, query_object);
    }
    
    api_pattern(line_id) {
        return _extend(this.api_common(), { uri: `${HOST_NAME}/patterns` }, {qs: { line_id: line_id }});
    }
    
    api_timetable(line_id) {
        return _extend(this.api_common(), { uri: `${HOST_NAME}/timetable` },{ qs: this._extend(this.query_common(), { line_id: line_id }) });
    }
    
    _extend() {
        var combined = {};
        [].slice.call(arguments).forEach(function(source) {
            for (var prop in source) {
                combined[prop] = source[prop];
            }
        });
        return combined;
    }
    
    _location_from_centroid(centroid) {
        if (centroid == null || centroid.Location == null || centroid.Location.Latitude == null || centroid.Location.Longitude == null) {
            return null;
        } else {
            return new Location(centroid.Location.Latitude, centroid.Location.Longitude);
        }
    }
    
    _heading(quays) {
        if (quays == null || quays.Quay.CompassOctant == null) {
            console.log('Quays: ' + quays);
            return null;
        } else {
            return (quays.Quay.CompassOctant == 'E') ? Direction.NORTH : Direction.SOUTH;
        }
    }

    async lines() {
        var opt = this.api_lines();
        console.log(util.inspect(opt));
        return await request(this.api_lines());
    }
    
    async patterns(line_id) {
        return await request(this.api_pattern(line_id));
    }

    async timetable(line_id) {
        return await request(this.api_timetable(line_id));
    }

    async stop_places() {
        var _ref = this;
       
        return await (request(this.api_stop_places()).then(function(response) {
            var parsed = JSON.parse(response.trim());
            var places = parsed.Siri.ServiceDelivery.DataObjectDelivery.dataObjects.SiteFrame.stopPlaces.StopPlace;
            return places.map(function(server_stop) {
                return new StopPlace(server_stop['@id'], server_stop.Name, _ref._location_from_centroid(server_stop.Centroid), server_stop.PublicCode, _ref._heading(server_stop.quays));
            });
        }));
    }
}


module.exports = {
    Location,
    StopPlace,

    create: function (api_key) {
        return new CaltrainApi(api_key);
    }
}
