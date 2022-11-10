require([
  "esri/Map",
  "esri/webscene/Slide",
  "esri/views/MapView",
  "esri/views/SceneView",
  "esri/WebScene",
  "esri/core/watchUtils",
  "esri/identity/IdentityManager",
  "esri/widgets/Sketch/SketchViewModel",
  "esri/geometry/Polyline",
  "esri/Graphic",
  "esri/tasks/support/Query",
  "esri/widgets/Legend",
  "esri/renderers/smartMapping/creators/color",
  "esri/geometry/Polygon",
  "esri/layers/FeatureLayer",
  "esri/renderers/smartMapping/symbology/color",
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/3.9.1/chart.min.js',
  "dojo/dom","dojo/on",
  "dojo/_base/lang",
  "dojo/_base/unload",
  "dojo/query",
  "dojo/dom-style",
  "dojo/NodeList-traverse",
  "dojo/domReady!"

], function(
  Map,
  Slide,
  MapView, SceneView, WebScene,
  watchUtils, esriId, SketchViewModel, Polyline, Graphic, Query, Legend, colorRendererCreator, Polygon, FeatureLayer, colorSchemes, Chart,
  dom, on, lang, baseUnload, query,domStyle
) {


//Store cred
//cred = "esri_jsapi_id_manager_data";
//baseUnload.addOnUnload(lang.hitch(esriId, storeCredentials));

//loadCredentials(esriId)

//Add all 7 scenario web scenes
var e0_2020         = "10ece76a05d34a62aab6da1fb533145d";
var e1_2030_d       = "a0917f65fa8d4e129c4ee2c364970c6e";
var e1_2030_d1       = "a0917f65fa8d4e129c4ee2c364970c6e";
// var e2_2030_cor     = "cc1aa0ae60f74f809f1da7dc1b4142f5";
// var e3_2040_d       = "64c9614c6b354f98a7cdd583b6c06eeb";
// var e4_2040_cor     = "c577b71b69e5444e9ff417c30bd333e3";
// var e6_2040_tod_b   = "6261a363f27348f6ac309afe5e4108ec";
// var e8_2050_tod_b   = "5d7a35d06b9d4c1ab0d0ed97c6c03399";

/*var featureServices = {
  "c0a44d54e51f42c9be1ceff98d1ff2e5": "0",  //E0_2020
    "28213426cca6474085970b3b083f1f63": "1", //E1_2030_D
    "4bdc2e3f3d30483a95c0046c2befb84c": "2", //E2_2030_COR
    "4d1f9043cec046608b30449f10bbf6ab": "3", //E3_2040_D
    "571115dd1d034f418100f09068651157": "4", //E4_2040_COR
    "d5ec4b1c983f4fe4b2bb3943c0e041f6": "5", //E6_2040_TOD_B
    "b0b2bdb3accc45f3910e79caa44f300c": "6" //E8_2050_TOD_B
}*/

var officeSceneLayer;

let currGraphic;
let currGeometry;
let currGeometry2;
let currGeometry3;
var dragging = false;

const sym = { // symbol used for polylines
  type: "simple-line", // autocasts as new SimpleMarkerSymbol()
  color: "#0066cc",
  width: "6",
  style: "solid"
}

turnOn = function(id){
  query("#greenspace").style("display", "none");
  query("#proximity").style("display", "none");
  query("#diversity").style("display", "none");
  query("#energy").style("display", "none");
  query("#" + id).style("display", "block");
}

var scenario_1 = document.getElementById("select_scenario_1");
var view_1_id  = "view1";
var view_1_container = "view1Div";


var scenario_2 = document.getElementById("select_scenario_2");
var view_2_id  = "view2";
var view_2_container = "view2Div";

// var scenario_3 = document.getElementById("select_scenario_3");
// var view_3_id  = "view3";
// var view_3_container = "view3Div";

//
var featureServices = {
   "2020-P": "aade0b0ee6a543c8ae7cbdd200ae1e06",  //E0_2020
    "2030-D":"aade0b0ee6a543c8ae7cbdd200ae1e06",
    "e1_2030_d1":"a0917f65fa8d4e129c4ee2c364970c6e" //E1_2030_D
    // "2030-C":"cc1aa0ae60f74f809f1da7dc1b4142f5", //E2_2030_COR
    // "2040-D":"64c9614c6b354f98a7cdd583b6c06eeb", //E3_2040_D
    // "2040-C":"c577b71b69e5444e9ff417c30bd333e3", //E4_2040_COR
    // "2040-T":"6261a363f27348f6ac309afe5e4108ec", //E6_2040_TOD_B
    // "2050-T":"5d7a35d06b9d4c1ab0d0ed97c6c03399" //E8_2050_TOD_B
}
this.highlight = [];


var synchronizeView = function(view, others) {
  others = Array.isArray(others) ? others : [others];

  var viewpointWatchHandle;
  var viewStationaryHandle;
  var otherInteractHandlers;
  var scheduleId;

  var clear = function() {
    if (otherInteractHandlers) {
      otherInteractHandlers.forEach(function(handle) {
        handle.remove();
      });
    }
    viewpointWatchHandle && viewpointWatchHandle.remove();
    viewStationaryHandle && viewStationaryHandle.remove();
    scheduleId && clearTimeout(scheduleId);
    otherInteractHandlers = viewpointWatchHandle = viewStationaryHandle = scheduleId = null;
  };

  var interactWatcher = view.watch("interacting,animation", function(newValue) {
    if (!newValue) {
      return;
    }
    if (viewpointWatchHandle || scheduleId) {
      return;
    }

    // start updating the other views at the next frame
    scheduleId = setTimeout(function() {
      scheduleId = null;
      viewpointWatchHandle = view.watch("viewpoint", function(
        newValue
      ) {
        others.forEach(function(otherView) {
          otherView.viewpoint = newValue;
        });
      });
    }, 0);

    // stop as soon as another view starts interacting, like if the user starts panning
    otherInteractHandlers = others.map(function(otherView) {
      return watchUtils.watch(
        otherView,
        "interacting,animation",
        function(value) {
          if (value) {
            clear();
          }
        }
      );
    });

    // or stop when the view is stationary again
    viewStationaryHandle = watchUtils.whenTrue(
      view,
      "stationary",
      clear
    );
  });

  return {
    remove: function() {
      this.remove = function() {};
      clear();
      interactWatcher.remove();
    }
  };
};

/**
 * utility method that synchronizes the viewpoints of multiple views
 */
var synchronizeViews = function(views) {
  var handles = views.map(function(view, idx, views) {
    var others = views.concat();
    others.splice(idx, 1);
    return synchronizeView(view, others);
  });

  return {
    remove: function() {
      this.remove = function() {};
      handles.forEach(function(h) {
        h.remove();
      });
      handles = null;
    }
  };
};


function getScenario(scenario){
  return featureServices[scenario];
}

/*function getUrlScenario(scenario){
  return featureUrls[scenario];
}*/

function changeWebScene(updatedScene, view_id, view_container){
  this.updatedScene = new WebScene({
    portalItem: {
      id: updatedScene
    }
  });

  if(view_id == "view1"){
    this.scenario1 = this.updatedScene;
    this.view1 = new SceneView({
      map: this.updatedScene,
      id : "view1",
      container: view_container,
      camera: {
          position: {
            spatialReference: {
              latestWkid: 3857,
              wkid: 102100
            },
            "x": -8836364.445195163,
            "y": 5407435.988391968,
            "z": 387.19603201467544
          },
          "heading": 342.1982325560038,
          "tilt": 85.93132180783782
          }
    });
      pass_views(view1, view_id);
  }
  else if(view_id == "view2"){
    this.scenario2 = this.updatedScene;
    this.view2 = new SceneView({
      map: this.updatedScene,
      id : "view2",
      container: view_container,
      camera: {
          position: {
            spatialReference: {
              latestWkid: 3857,
              wkid: 102100
            },
            "x": -8836364.445195163,
            "y": 5407435.988391968,
            "z": 387.19603201467544
          },
          "heading": 342.1982325560038,
          "tilt": 85.93132180783782
          }
    });
      pass_views(view2, view_id);
  }


  // else if(view_id == "view3"){
  //   this.scenario3 = this.updatedScene;
  //   this.view3 = new SceneView({
  //     map: this.updatedScene,
  //     id : "view3",
  //     container: view_container,
  //     camera: {
  //         position: {
  //           spatialReference: {
  //             latestWkid: 3857,
  //             wkid: 102100
  //           },
  //           "x": -8836364.445195163,
  //           "y": 5407435.988391968,
  //           "z": 387.19603201467544
  //         },
  //         "heading": 342.1982325560038,
  //         "tilt": 85.93132180783782
  //         }
  //   });
  //     pass_views(view3, view_id);
  // }

  //this.scenarios = {"view1":this.scenario1, "view2":this.scenario2, "view3":this.scenario3};
  this.scenarios = {"view1":this.scenario1, "view2":this.scenario2};
//   if (this.view1 && this.view2 && this.view3){
//     dragViews(view1, view2, view3);
//   }
// }
if (this.view1 && this.view2){
  dragViews(view1, view2);
}
}

// function registerDragView(view,  view1, view2, view3){
//     view.on('drag', ["Control"], e => {
//     e.stopPropagation();
//     let p = view1.toMap(e);
//     let p2 = view2.toMap(e);
//     let p3 = view3.toMap(e);
//     if (e.action === "start") {
//       dragging = true;
//       if (currGraphic && currGraphic2 && currGraphic3){
//         view1.graphics.remove(currGraphic);
//         view2.graphics.remove(currGraphic2);
//         view3.graphics.remove(currGraphic3);
//       }

function registerDragView(view,  view1, view2){
    view.on('drag', ["Control"], e => {
    e.stopPropagation();
    let p = view1.toMap(e);
    let p2 = view2.toMap(e);
    if (e.action === "start") {
      dragging = true;
      if (currGraphic && currGraphic2){
        view1.graphics.remove(currGraphic);
        view2.graphics.remove(currGraphic2);
      }

      //For view 1
      currGeometry = new Polyline({
        paths: [
          [p.x, p.y, 0]
        ],
        spatialReference: { wkid: 102100 }
      });

      currGraphic = new Graphic({
        geometry: currGeometry,
        symbol: sym
      });

      //For view 2
      currGeometry2 = new Polyline({
        paths: [
          [p2.x, p2.y, 0]
        ],
        spatialReference: { wkid: 102100 }
      });

      currGraphic2 = new Graphic({
        geometry: currGeometry2,
        symbol: sym
      });

      // //For view 3
      // currGeometry3 = new Polyline({
      //   paths: [
      //     [p3.x, p3.y, 0]
      //   ],
      //   spatialReference: { wkid: 102100 }
      // });
      //
      // currGraphic3 = new Graphic({
      //   geometry: currGeometry3,
      //   symbol: sym
      // });

    // } else {
    //   if (currGraphic && currGraphic2 && currGraphic3){
    //     view1.graphics.remove(currGraphic);
    //     view2.graphics.remove(currGraphic2);
    //     view3.graphics.remove(currGraphic3);
    //   }
    //   currGeometry.paths[0].push([p.x, p.y, 0]);
    //   currGeometry2.paths[0].push([p2.x, p2.y, 0]);
    //   currGeometry3.paths[0].push([p3.x, p3.y, 0]);
  } else {
    if (currGraphic && currGraphic2){
      view1.graphics.remove(currGraphic);
      view2.graphics.remove(currGraphic2);
    }
    currGeometry.paths[0].push([p.x, p.y, 0]);
    currGeometry2.paths[0].push([p2.x, p2.y, 0]);
      //View 1
      currGraphic = new Graphic({
        geometry: currGeometry,
        symbol: sym
      });

      //View 2
      currGraphic2 = new Graphic({
        geometry: currGeometry2,
        symbol: sym
      });

      // //View 3
      // currGraphic3 = new Graphic({
      //   geometry: currGeometry3,
      //   symbol: sym
      // });

      view1.graphics.add(currGraphic);
      view2.graphics.add(currGraphic2);
      //view3.graphics.add(currGraphic3);
    }
  });
}

// function dragViews(view1, view2, view3){
//   synchronizeViews([view1, view2, view3]);
//   registerDragView(view1, view1, view2, view3);
//   registerDragView(view2, view1, view2, view3);
//   registerDragView(view3, view1, view2, view3);
// }

function dragViews(view1, view2){
  synchronizeViews([view1, view2]);
  registerDragView(view1, view1, view2);
  registerDragView(view2, view1, view2);
  //registerDragView(view3, view1, view2, view3);
}



function changeScenario(id, scenario){
  if(id == "select_scenario_1"){
    var scenario_1 = document.getElementById("select_scenario_1").value;
    var view_1_id  = "view1";
    var view_1_container = "view1Div";
    var newScenario_1 = getScenario(scenario_1);
    changeWebScene(newScenario_1, view_1_id, view_1_container);
  }
  else if(id == "select_scenario_2"){
    var scenario_2 = document.getElementById("select_scenario_2").value;
    var view_2_id  = "view2";
    var view_2_container = "view2Div";
    var newScenario_2 = getScenario(scenario_2);
    changeWebScene(newScenario_2, view_2_id, view_2_container);
  }
  // else if(id == "select_scenario_3"){
  //   var scenario_3 = document.getElementById("select_scenario_3").value;
  //   var view_3_id  = "view3";
  //   var view_3_container = "view3Div";
  //   var newScenario_3 = getScenario(scenario_3);
  //   changeWebScene(newScenario_3, view_3_id, view_3_container);
  // }
}

function initialize(){
  changeScenario("select_scenario_1", "2020-P");
  changeScenario("select_scenario_2", "2030-D");
  //changeScenario("select_scenario_3", "2030-C");
}

initialize();

var scenario_labels = [];
on(dom.byId("select_scenario_1"), "change", lang.hitch(this, function(evt){
  var id_viewer = "select_scenario_1";
  changeScenario(id_viewer, evt.currentTarget.value);
  scenario_labels[0] = evt.currentTarget.value;
  change_data(scenario_labels[0], 0);
}));


on(dom.byId("select_scenario_2"), "change", lang.hitch(this, function(evt){
  var id_viewer = "select_scenario_2";
  changeScenario(id_viewer, evt.currentTarget.value);
  scenario_labels[1] = evt.currentTarget.value;
  change_data(scenario_labels[1], 1);
}));


// on(dom.byId("select_scenario_3"), "change", lang.hitch(this, function(evt){
//   var id_viewer = "select_scenario_3";
//   changeScenario(id_viewer, evt.currentTarget.value);
//   scenario_labels[2] = evt.currentTarget.value;
//   change_data(scenario_labels[2], 2);
// }));

//Update scenario charts (right now labels)
function change_data(label, index){
	resEnergy.data.labels[index] = label;
	resEnergy.update();
	comEnergy.data.labels[index] = label;
	comEnergy.update();
	//updateGraph(resEnergy);
	//updateGraph(comEnergy);
}


performQuery = function(officeLayerView, geometry, id){
    var sceneLayer = officeLayerViews[id];
    var fields = ["*"];
    var query = sceneLayer.createQuery();

    if(geometry){
      var polygonJson1 = {"rings":[currGeometry.paths[0]], "spatialReference":{"wkid":102100}};
      var poly1         = new Polygon(polygonJson1);
      query.geometry = poly1;
      query.spatialRelationship = "intersects";
    }
    else {
      query.where = "1 = 1"

	}
    query.outFields = fields
    sceneLayer.queryFeatures(query).then(
      function(result) {
        objectids = [];
        for(var i in result.features){
          objectids.push(result.features[i].attributes.OBJECTID);
		 //updateEnergyCount(result.features[i].attributes["EUI_GJ"]);
		 // updateEnergyCount(result.features[i].attributes["EUI_GJ"], result.features[i].attributes["EUC_GJ"]);
        }
        if (geometry){
          this.highlight.push(officeLayerView.highlight(objectids));
        }
        // Update statistics
		updateStatistics(result.features);
    });
}

var officeLayerViews = {};

function pass_views(view, id){
  view.when(function(){
    officeSceneLayer = this.scenarios[id].allLayers.filter(function(elem){
      return elem.title === "Buildings";
    }).items[0];

    view.whenLayerView(officeSceneLayer).then(function(officeLayerView){
      officeLayerViews[id] =  officeLayerView
      setTimeout(performQuery, 10000, officeLayerView, false, id);
      view.on("pointer-up", [], e => {
        if(dragging){
          if(this.highlight){
            for(var i in this.highlight){
              this.highlight[i].remove();
            }
            this.highlight = [];
          }
          dragging = false;
          view.graphics.remove(currGraphic);
          for (var i in officeLayerViews){
              performQuery(officeLayerViews[i], true, i);
          }
        }
      });
    });
  });
}

var resEnergy = new Chart(document.getElementById("edlu"), {
	type: "bar",
	data: {
		labels: ["2020-P", "2030-D", "2030-C"],
		datasets: [
			{
				label: "Heating",
				data: [1,2,3],
				backgroundColor: "#FFCC56"
			},
			{
				label: "Cooling",
				data: [1,1,1],
				backgroundColor: "#FF9F40"
			},
			{
				label: "Lighting",
				data: [1,2,4],
				backgroundColor: "#FE6383"
			},
			{
				label: "Equipment",
				data: [1,5,8],
				backgroundColor: "#4CC0C0"
			},
			{
				label: "Domestic Hot Water",
				data: [1,1,1],
				backgroundColor: "#36A2EB"
			}
		]
	},
	options: {
		scales: {
			xAxes: [{ stacked: true }],
			yAxes: [{ stacked: true }]
		},
		legend: {
			display: false
		}
	}
});

/*var resEnergy = new Chart(document.getElementById("edlu"), {
	type: "doughnut",
	data: {
		labels: ["2020-P", "2030-D", "2030-C"],
		datasets: [
			{
				labels: ["EUI_GJ"],
				data: [1,2,3],
				backgroundColor: ["#FFCC56", "#FF9F40", "#FE6383"]
			}
	},
	options: {
		legend: {
			display: false
		}
	}
});*/


const ctx = document.getElementById('ResPopulation').getContext('2d');
const myChart = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: ['Current', 'Proposed'],
        datasets: [{
            label: 'Population',
            data: [12, 19],
            backgroundColor: [
                'rgba(83,213,251, 1)',
                'rgba(83,213,251, 1)'
            ],
            borderColor: [
                'rgba(0,0,0, 1)',
                'rgba(0,0,0, 1)'
            ],
            borderWidth: 0
        }]
    },
    options: {
      plugins: {
        "legend": {
          "display": false,
          "position": "bottom",
          "align": "center"
        }},
        scales: {
            y: {
                beginAtZero: true
            }
        },
}});

const ctx1 = document.getElementById('SpaceUse').getContext('2d');
const myChart1 = new Chart(ctx1, {
  type: 'bar',
    data: {
        labels: ['Current', 'Proposed'],
        datasets: [{
            label: 'Parking',
            data: [12, 19],
            backgroundColor: [
                'rgba(198,199,201,1)',
                'rgba(198,199,201,1)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 0
        },
        {
            label: 'Office',
            data: [12, 19],
            backgroundColor: [
                'rgba(2,197,141,1)',
                'rgba(2,197,141,1)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 0
        },
        {
            label: 'Commerial',
            data: [12, 19],
            backgroundColor: [
                'rgba(251,83,83,1)',
                'rgba(251,83,83,1)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 0
        },
        {
            label: 'Residential',
            data: [12, 19],
            backgroundColor: [
                'rgba(252,190,44,1)',
                'rgba(252,190,44,1)'
            ],
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 0
        }
      ]
    },
    options: {
     plugins: {
       "legend": {
         "display": true,
         "position": "bottom",
         "align": "center"
       },

       title: {
         display: false,
         text: 'Chart.js Bar Chart - Stacked'
       },
     },
     responsive: true,
     scales: {
       x: {
         stacked: true,
       },
       y: {
         stacked: true
       }
     }
    },
});


const ctx2 = document.getElementById('VehicleTrips').getContext('2d');
const myChart2 = new Chart(ctx2, {
  type: 'bar',
    data: {
        labels: ['Current', 'Proposed'],
        datasets: [{
            label: 'Bike AM',
            data: [12, 19],
            backgroundColor: [
                'rgba(249,144,66,1)',
                'rgba(249,144,66,1)'
            ],
            stack: 'Stack 0',
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 0
        },
        {
            label: 'Bike PM',
            data: [12, 19],
            backgroundColor: [
                'rgba(216,90,40,1)',
                'rgba(216,90,40,1)'
            ],
            stack: 'Stack 0',
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 0
        },
        {
            label: 'Car AM',
            data: [12, 19],
            backgroundColor: [
                'rgba(172,111,248,1)',
                'rgba(172,111,248,1)'
            ],
            stack: 'Stack 1',
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 0
        },
        {
            label: 'Car PM',
            data: [12, 19],
            backgroundColor: [
                'rgba(111,70,216,1)',
                'rgba(111,70,216,1)'
            ],
            stack: 'Stack 1',
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 0
        },
        {
            label: 'Bus AM',
            data: [12, 19],
            backgroundColor: [
                'rgba(192,229,144,1)',
                'rgba(192,229,144,1)'
            ],
            stack: 'Stack 2',
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 0
        },
        {
            label: 'Bus PM',
            data: [12, 19],
            backgroundColor: [
                'rgba(95,152,75,1)',
                'rgba(95,152,75,1)'
            ],
            stack: 'Stack 2',
            borderColor: [
                'rgba(255, 99, 132, 1)',
                'rgba(255, 159, 64, 1)'
            ],
            borderWidth: 0
        }
      ]
    },
    options: {
    plugins: {
        "legend": {
          "display": true,
          "position": "bottom",
          "align": "center"
        },

      title: {
        display: false,
        text: 'Chart.js Bar Chart - Stacked'
      },
    },
    responsive: true,
    interaction: {
      intersect: false,
    },
    scales: {
      x: {
        stacked: true,
      },
      y: {
        stacked: true
      }
},
  },
});























var comEnergy = new Chart(document.getElementById("elu"), {
	type: "bar",
	data: {
		labels: ["2020-P", "2030-D", "2030-C"],
		datasets: [
			{
				label: "Heating",
				data: [1,2,3],
				backgroundColor: "#FFCC56"
			},
			{
				label: "Cooling",
				data: [1,1,1],
				backgroundColor: "#FF9F40"
			},
			{
				label: "Lighting",
				data: [1,2,4],
				backgroundColor: "#FE6383"
			},
			{
				label: "Equipment",
				data: [1,5,8],
				backgroundColor: "#4CC0C0"
			},
			{
				label: "Domestic Hot Water",
				data: [1,1,1],
				backgroundColor: "#36A2EB"
			}
		]
	},
	options: {
		scales: {
			xAxes: [{ stacked: true }],
			yAxes: [{ stacked: true }]
		},
		legend: {
			display: false
		}
	}
});


var legend = new Chart(document.getElementById("legend"), {
	type: "doughnut",
	data: {
		labels: ["Equipment", "Lighting", "Heating", "Cooling", "Domestic Hot Water"],
		datasets: [{
			labels: [
				"Red",
				"Yellow",
				"Blue"
			],
			data: [0,0,0,0,0],
			backgroundColor: ["#4CC0C0", "#FE6383", "#FFCC56", "#FF9F40", "#36A2EB"]
		}]
	},
	options: {
		cutoutPercentage: 100
	}
});

updateLabel = function(labelName, value){
	document.getElementById(labelName).innerHTML = String(round(value,2));
}

function round(value, decimals){
	return Number(Math.round(value+'e'+decimals)+'e-'+decimals);
}

calcAverage = function(data, field){
	var sum = calcSum(data, field);
	return sum/data.length;
}

calcSum = function(data, field){
	var sum = 0;
	for(var i in data){
		num = parseInt(data[i].attributes[field]);
		if(isNaN(num)) num = 0;
		sum += num;
	}
	return sum;
}

calcEnergySum = function(data, bldgTypeField, field){
    var light = 0;
    var heat  = 0;
    var cool  = 0;
    var equip  = 0;
    var dhw = 0;
    var clight = 0;
    var cheat  = 0;
    var ccool  = 0;
    var cequip  = 0;
    var cdhw = 0;
    for(var i in data){
      if (data[i].attributes[bldgTypeField] == "RS_SF_D" || data[i].attributes[bldgTypeField] == "RS_MF_L"){
        light += parseInt(data[i].attributes[field[0]]) || 0;
        heat += parseInt(data[i].attributes[field[1]])|| 0;
        cool += parseInt(data[i].attributes[field[2]])|| 0;
        equip += parseInt(data[i].attributes[field[3]])|| 0;
        dhw += parseInt(data[i].attributes[field[4]])|| 0;
      }
      else {
        clight += parseInt(data[i].attributes[field[0]])|| 0;
        cheat += parseInt(data[i].attributes[field[1]])|| 0;
        ccool += parseInt(data[i].attributes[field[2]])|| 0;
        cequip += parseInt(data[i].attributes[field[3]]|| 0);
        cdhw += parseInt(data[i].attributes[field[4]])|| 0;
      }
    }
    return [[light, heat, cool, equip, dhw], [clight, cheat, ccool, cequip, cdhw]];
}

calcTotalEUI = function(data, bldgTypeField, field){
	var eui_gj = 0;
	for(var i in data){
		eui_gj += parseInt(data[i].attributes["EUI_GJ"]) || 0;
	}
	return eui_gj;
}

var proximityValues = [0,0,0,0,0];
updateProximityCount = function(val){
	var bucket = 0;
	switch(true){
		case val < 200:
			bucket = 0;
			break;
		case val < 400:
			bucket = 1;
			break;
		case val < 600:
			bucket = 2;
			break;
		case val < 800:
			bucket = 3;
			break;
		case val > 800:
			bucket = 4;
			break;
	}
	proximityValues[bucket] = proximityValues[bucket] + 1;
}

var greenProximityValues = [0,0,0,0,0];
updateGreenProximityCount = function(val){
	var bucket = 0;
	switch(true){
		case val < 100:
			bucket = 0;
			break;
		case val < 200:
			bucket = 1;
			break;
		case val < 300:
			bucket = 2;
			break;
		case val > 300:
			bucket = 3;
			break;
	}
	greenProximityValues[bucket] = greenProximityValues[bucket] + 1;
}


var energyValues = [0,0,0,0,0];
updateEnergyCount = function(val, energyVal){
	var bucket = 0;
	switch(val){
		case "RS_SF_D":
			bucket = 0;
			break;
		case "RS_MF_L":
			bucket = 1;
			break;
		case "MX":
			bucket = 2;
			break;
		case "CV":
			bucket = 3;
			break;
		case "CM":
			bucket = 4;
			break;
	}
	energyValues[bucket] = energyValues[bucket] + energyVal;
}

var dwellingType = [0,0,0,0,0];
updateDwellingCount = function(val){
	var bucket = 0;
	switch(val){
		case "RS_SF_D":
		bucket = 0;
		break;
		case "RS_MF_L":
		bucket = 1;
		break;
		case "MX":
		bucket = 2;
		break;
		case "CV":
		bucket = 3;
		break;
		case "CM":
		bucket = 4;
		break;
	}
	dwellingType[bucket] = dwellingType[bucket] + 1;
}

updateGraph = function(chart, proximity){
	for (var index = 0; index < proximity.length; index++){
		chart.data.datasets[0].data[index] = proximity[index];
	}
	chart.update();
}

var eui_totals = [];

updateStatistics = function(features, view){
	var greenArea = 0;
	//var averageDDenp = calcAverage(features, "DDenp");
	//var area = calcSum(features, "parcelarea")*0.0001;
	//var popSum = calcSum(features, "res_count")*2;
	//var popden = popSum / area;
	//var energy = calcEnergySum(features, "LANDUSE", ["EUI_GJ"]);
	var energy_EUI = calcTotalEUI(features, "EUI_GJ")
	eui_totals.push(energy_EUI);
	console.log(eui_totals);
	//var energy = calcEnergySum(features, "LANDUSE", ["lighting_GJ_annual", "heating_GJ_annual", "cooling_GJ_annual", "equipment_GJ_annual", "dhw_GJ_annual"]);
	//var greenspaceVal = greenArea/popSum*1000;
	//updateLabel("dden", averageDDenp);
	//updateLabel("popden", popden);
	//updateLabel("pden", features.length/area);
	//updateLabel("gi", greenspaceVal);
	//updateGraph(proximity, proximityValues);
	//updateGraph(greenspace, greenProximityValues);
	//updateGraph(diversity, dwellingType);
	//updateGraph(energyGraph, energyValues);
	updateGraph(resEnergy, eui_totals);
	//updateGraph(resEnergy, energy[0]);
	//updateGraph(comEnergy, energy[1]);
}



});
