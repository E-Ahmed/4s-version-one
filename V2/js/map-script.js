// My locations data
var locations = [

    {
        title: '4S Technology Company',
        location: {
            lat: 30.0523003,
            lng: 31.193510800000002
        }
    }

];

// Global Variables Declaration
var map;

var bounds;

// The popup that shows the location information
var infoWindow;

// Initialze google maps
function initMap() {
    // Declare the location in the center of the map

    // Constructor creates a new map
    map = new google.maps.Map(document.getElementById('map'), {
        center: new google.maps.LatLng(30.0523003,31.193510800000002),
        zoom: 8,
        mapTypeControl: true,
        gestureHandling: 'greedy',
    });

    infoWindow = new google.maps.InfoWindow();

    bounds = new google.maps.LatLngBounds();

    google.maps.event.addDomListener(window, 'resize', function() {
        map.fitBounds(bounds);
    });

    ko.applyBindings(new ViewModel());
}

// Handle map error (If google maps isn't working)
function mapError() {
    alert('An error occured with loading google maps, Please try refreshing the page!');
}

// Put the markers Location
var markerLocation = function(data) {
    var self = this;

    this.title = data.title;
    this.position = data.location;
    this.street = '';
    this.city = '';
    this.phone = '';

    this.visible = ko.observable(true);

    // Style the markers a bit, This will be our listing marker icon
    var defaultIcon = makeMarkerIcon('A52A2A');

    // Create a "highlighted location" marker color for when the user
    // mouses over the marker
    var highlightedIcon = makeMarkerIcon('FFFF24');

    // Foursquare API Client
    clientID = "FXXAOCEZH4QZ1M1EBI3JBOHK1Q4RLIZ2HI10YBZS4VVNUV2F";
    clientSecret="QUPWBE3OPDMN0CTF2Z0V0C5AVSKEV3XHIIPEEI3BKXRN00FS";
    // URL for Foursquare API
    var reqURL = 'https://api.foursquare.com/v2/venues/search?ll=' + this.position.lat + ',' + this.position.lng + '&client_id=' + clientID + '&client_secret=' + clientSecret + '&v=20160118' + '&query=' + this.title;

    $.getJSON(reqURL).done(function(data) {
		var results = data.response.venues[0];
        self.street = results.location.formattedAddress[0] ? results.location.formattedAddress[0]: 'N/A';
        self.city = results.location.formattedAddress[1] ? results.location.formattedAddress[1]: 'N/A';
        self.phone = results.contact.formattedPhone ? results.contact.formattedPhone : 'N/A';
    }).fail(function() {
        alert('Something went wrong with foursquare!');
    });

    // Create a marker per location
    this.marker = new google.maps.Marker({
        position: this.position,
        title: this.title,
        animation: google.maps.Animation.DROP,
        icon: defaultIcon
    });

    self.filterMarkers = ko.computed(function() {
        // Show marker and extend bounds
        if (self.visible() === true) { // visible() => beacuse of using ko.observables
            self.marker.setMap(map); // put markers on the map
            bounds.extend(self.marker.position);
            map.fitBounds(bounds);
        } else {
            self.marker.setMap(null);
        }
    });

    // Create an onclick event to open an infowindow at each marker
    this.marker.addListener('click', function() {
        populateInfoWindow(this, self.street, self.city, self.phone, infoWindow);
        this.setAnimation(google.maps.Animation.BOUNCE);
        setTimeout((function() {
            this.setAnimation(null);
        }).bind(this), 1400);
        //map.panTo(this.getPosition);
    });

    // Two event listeners - one for mouseover, one for mouseout,
    // to change the colors back and forth
    this.marker.addListener('mouseover', function() {
        this.setIcon(highlightedIcon);
    });
    this.marker.addListener('mouseout', function() {
        this.setIcon(defaultIcon);
    });

    // Show item info when selected from list
    this.show = function(location) {
        google.maps.event.trigger(self.marker, 'click');
    };
};

// View Model
var ViewModel = function() {
    var self = this;

    this.searchItem = ko.observable('');
    this.mapList = ko.observableArray([]);

    // Add marker's location for each location
    locations.forEach(function(location) {
        self.mapList.push(new markerLocation(location));
    });

    // Locations list viewed on map
    this.locationList = ko.computed(function() {
        var searchFilter = self.searchItem().toLowerCase();
        if (searchFilter) {
            return ko.utils.arrayFilter(self.mapList(), function(location) {
                var str = location.title.toLowerCase();
                var result = str.includes(searchFilter);
                location.visible(result);
                return result;
            });
        }
        self.mapList().forEach(function(location) {
            location.visible(true);
        });
        return self.mapList();
    }, self);
};

// This function populates the infowindow when the marker is clicked. We'll only allow
// one infowindow which will open at the marker that is clicked, and populate based
// on that markers position.
function populateInfoWindow(marker, street, city, phone, infowindow) {
    // Check to make sure the infowindow is not already opened on this marker.
    if (infowindow.marker != marker) {
        // Clear the infowindow content to give the streetview time to load.
        infowindow.setContent('');
        infowindow.marker = marker;
        // Make sure the marker property is cleared if the infowindow is closed.
        infowindow.addListener('closeclick', function() {
            infowindow.marker = null;
        });
        var streetViewService = new google.maps.StreetViewService();
        var radius = 50;

        // In case the status is OK, which means the pano was found, compute the
        // position of the streetview image, then calculate the heading, then get a
        // panorama from that and set the options
        var getStreetView = function(data, status) {
            if (status == google.maps.StreetViewStatus.OK) {
                var nearStreetViewLocation = data.location.latLng;
                var heading = google.maps.geometry.spherical.computeHeading(
                nearStreetViewLocation, marker.position);
                infowindow.setContent('<h3>' + marker.title + '</h3>' + '<div' + street + "<br>" + city + "<br>" + phone + '</div>' + '</div><div id="pano"></div>');
                var panoramaOptions = {
                    position: nearStreetViewLocation,
                    pov: {
                    heading: heading,
                    pitch: 30
                    }
                };
                var panorama = new google.maps.StreetViewPanorama(
                document.getElementById('pano'), panoramaOptions);
            } else {
                infowindow.setContent('<h3>' + marker.title + '</h3>' + '<div' + street + "<br>" + city + "<br>" + phone + '</div>' + '<div>No Street View Found</div>');
            }
        };

        // Use streetview service to get the closest streetview image within
        // 50 meters of the markers position
        streetViewService.getPanoramaByLocation(marker.position, radius, getStreetView);
        // Open the infowindow on the correct marker.
        infowindow.open(map, marker);
    }
}

// This function takes in a COLOR, and then creates a new marker
// icon of that color. The icon will be 21 px wide by 34 high. have an origin
// of 0, 0 and be anchored at 10, 34
function makeMarkerIcon(markerColor) {
    var markerImage = new google.maps.MarkerImage(
        'http://chart.googleapis.com/chart?chst=d_map_spin&chld=1.15|0|'+ markerColor +
          '|40|_|%E2%80%A2',
          new google.maps.Size(21, 34),
          new google.maps.Point(0, 0),
          new google.maps.Point(10, 34),
          new google.maps.Size(21,34));
          return markerImage;
}
