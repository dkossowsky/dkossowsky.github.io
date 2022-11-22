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


//Add all 7 scenario web scenes
var e0_2020         = "6f99d20e599c4e5cb4dd290f90749c52";
var e1_2030_d       = "d37b946e1b6c453186467c0a6a04a696";
var e1_2030_d1       = "2bcc4a56f2db49c1ad708e3af630ed35";


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


//
var featureServices = {
   "2020-P": "6f99d20e599c4e5cb4dd290f90749c52",  //E0_2020
    "2030-D":"d37b946e1b6c453186467c0a6a04a696",
    "e1_2030_d1":"2bcc4a56f2db49c1ad708e3af630ed35" //E1_2030_D
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
            "x": -8832090.638809085,
            "y": 5423354.957085222,
            "z": 373.1890557408333
          },
          "heading": 87.39576429049322,
          "tilt": 77.37794642057423
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
            "x": -8832090.638809085,
            "y": 5423354.957085222,
            "z": 373.1890557408333
          },
          "heading": 87.39576429049322,
          "tilt": 77.37794642057423
          }
    });
      pass_views(view2, view_id);
  }


this.scenarios = {"view1":this.scenario1, "view2":this.scenario2};

if (this.view1 && this.view2){
  dragViews(view1, view2);
}
}

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

      view1.graphics.add(currGraphic);
      view2.graphics.add(currGraphic2);
    }
  });
}

function dragViews(view1, view2){
  synchronizeViews([view1, view2]);
  registerDragView(view1, view1, view2);
  registerDragView(view2, view1, view2);
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
}

function initialize(){
  changeScenario("select_scenario_1", "2020-P");
  changeScenario("select_scenario_2", "2030-D");
}

initialize();

var scenario_labels = [];
//var myChart1;
//var myChart;
var myChartSpace1;
var myChartSpace;
var myChartPop;
var myChartVehicle;
var arrayDK = [[1,1],[1,1],[1,1],[1,1]];
//DK - I created an array below with the values needed for the charts. Then I reference them in the javascript below.
var resArray = [[508,16198],[242,7714],[2041,60],[1335,3547]];
var spaceArrayCurr = [120,0,0,0,969,37638,0,1393,0,0];
var spaceArrayProp = [0,437,8433,0,2995,0,437075,2632,0,0];
var vehicleArray = [[1583,2249],[1458,2254],[72,375],[44,376],[20,54],[42,54]];

//var leftSelect = document.getElementById("select_scenario_1");
//var selectedTextL = leftSelect.options[leftSelect.selectedIndex].text;
//var rightSelect = document.getElementById("select_scenario_2");
//var selectedTextR = rightSelect.options[rightSelect.selectedIndex].text;
var selectedTextL = 'As Built';  //initial text for left
var selectedTextR = 'Proposal'; //initial text for right

on(dom.byId("select_scenario_1"), "change", lang.hitch(this, function(evt){
  var id_viewer = "select_scenario_1";

  changeScenario(id_viewer, evt.currentTarget.value);
  scenario_labels[0] = evt.currentTarget.value;
  //testDK();

  //alert(evt.currentTarget.value);



  if (evt.currentTarget.value == "2020-P"){ //As Built Conditions
    //updateGraph(myChartSpace1,[[190,920,530,440]]); I don't need to update this one on this end
    updateGraph(myChartSpace,[[120,0,0,0,969,37638,0,1393,0,0]]);
    updateGraph(myChartPop,[[(resArray[0][0],508),(resArray[0][1])],[(resArray[1][0],242),(resArray[1][1])],[(resArray[2][0],2041),(resArray[2][1])],[(resArray[3][0],1335),(resArray[3][1])]]);
    updateGraph(myChartVehicle,[[(vehicleArray[0][0],1583),(vehicleArray[0][1])],[(vehicleArray[1][0],1458),(vehicleArray[1][1])],[(vehicleArray[2][0],72),(vehicleArray[2][1])],[(vehicleArray[3][0],44),(vehicleArray[3][1])],[(vehicleArray[4][0],20),(vehicleArray[4][1])],[(vehicleArray[5][0],42),(vehicleArray[5][1])]]); //Left side: Bike AM = 99, PM = 199, Car AM = 299, PM = 399, Bike AM - 499, PM = 599
    updateText(myChartPop,"As Built");
    updateText(myChartSpace, "As Built");
    updateText(myChartVehicle, "As Built");
    resArray[0][0] = 508; //change this as well as the value above (the one above sets the value temporarily. This replaces the value in the array.
    resArray[1][0] = 242;
    resArray[2][0] = 2041;
    resArray[3][0] = 1335;
    // spaceArrayCurr = [1301,2360,3210,40]
    vehicleArray[0][0] = 1583;
    vehicleArray[1][0] = 1458;
    vehicleArray[2][0] = 72;
    vehicleArray[3][0] = 44;
    vehicleArray[4][0] = 20;
    vehicleArray[5][0] = 42;

  }


  else if (evt.currentTarget.value == "2030-D"){ //Developer Proposal
    //updateGraph(myChartSpace1,[[190,920,530,440]]); I don't need to update this one on this end
    updateGraph(myChartSpace,[[0,437,8433,0,2995,0,437075,2632,0,0]]);
    //updateGraph(myChartPop,[[(resArray[0],8),(resArray[1])]]); //99 is the new population value (left side)
    updateGraph(myChartPop,[[(resArray[0][0],16198),(resArray[0][1])],[(resArray[1][0],7714),(resArray[1][1])],[(resArray[2][0],60),(resArray[2][1])],[(resArray[3][0],3547),(resArray[3][1])]]);
    updateGraph(myChartVehicle,[[(vehicleArray[0][0],2249),(vehicleArray[0][1])],[(vehicleArray[1][0],2254),(vehicleArray[1][1])],[(vehicleArray[2][0],375),(vehicleArray[2][1])],[(vehicleArray[3][0],376),(vehicleArray[3][1])],[(vehicleArray[4][0],54),(vehicleArray[4][1])],[(vehicleArray[5][0],54),(vehicleArray[5][1])]]); //Left side: Bike AM = 99, PM = 199, Car AM = 299, PM = 399, Bike AM - 499, PM = 599
    updateText(myChartPop,"Developer");
    updateText(myChartSpace, "Developer");
    updateText(myChartVehicle, "Developer");
    resArray[0][0] = 16198; //change this as well as the value above (the one above sets the value temporarily. This replaces the value in the array.
    resArray[1][0] = 7714;
    resArray[2][0] = 60;
    resArray[3][0] = 3547;
    // spaceArrayCurr = [101,260,310,40]
    vehicleArray[0][0] = 2249; // bike AM
    vehicleArray[1][0] = 2254; // bike PM
    vehicleArray[2][0] = 375; //car AM
    vehicleArray[3][0] = 376; // car PM
    vehicleArray[4][0] = 54; // bus AM
    vehicleArray[5][0] = 54; // bus PM


  }
  else if (evt.currentTarget.value == "e1_2030_d1"){ //Alternate Design
    //updateGraph(myChartSpace1,[[190,920,530,440]]); I don't need to update this one on this end
    updateGraph(myChartSpace,[[1821,7388,13942,3367,2721,66975,171885,15982,3642,11495]]);
    updateGraph(myChartPop,[[(resArray[0][0],4183),(resArray[0][1])],[(resArray[1][0],1865),(resArray[1][1])],[(resArray[2][0],2942),(resArray[2][1])],[(resArray[3][0],3846),(resArray[3][1])]]);
    updateGraph(myChartVehicle,[[(vehicleArray[0][0],2159),(vehicleArray[0][1])],[(vehicleArray[1][0],1888),(vehicleArray[1][1])],[(vehicleArray[2][0],360),(vehicleArray[2][1])],[(vehicleArray[3][0],315),(vehicleArray[3][1])],[(vehicleArray[4][0],51),(vehicleArray[4][1])],[(vehicleArray[5][0],45),(vehicleArray[5][1])]]); //Left side: Bike AM = 99, PM = 199, Car AM = 299, PM = 399, Bike AM - 499, PM = 599
    updateText(myChartPop,"Alternative");
    updateText(myChartSpace, "Alternative");
    updateText(myChartVehicle, "Alternative");
    resArray[0][0] = 4183; //change this as well as the value above (the one above sets the value temporarily. This replaces the value in the array.
    resArray[1][0] = 1865;
    resArray[2][0] = 2942;
    resArray[3][0] = 3846;
    // spaceArrayCurr = [11,60,10,340]
    vehicleArray[0][0] = 2159;
    vehicleArray[1][0] = 1888;
    vehicleArray[2][0] = 360;
    vehicleArray[3][0] = 315;
    vehicleArray[4][0] = 51;
    vehicleArray[5][0] = 45;

  }
  else {
    updateGraph(myChartSpace1,[[10,10,10,10]]);
  }


//arrayDK[0] = "blueberry"];


  //change_data(scenario_labels[0], 0);
  // if (evt.currentTarget.value == "Developer Proposal"){
  //     updateGraph(myChart1,[[30,30],[10,10],[1,1],[2,3]]);
  // }
  // else {
  //     updateGraph(myChart1,[[300,30],[100,10],[100,1],[200,3]]);
  //   }
  //if statements can go in here data array variable with if statement
  //lookup for the left side and right side graphs -- can be a function call to return the current array is
  //updateGraph(myChart,dataArrayDK)
//  updateGraph(myChart1,[[30,30],[10,10],[1,1],[2,3]]);
}));

// if evt.currentTarget.value = "development proposal", then [[1,1],2[34])
// function testDK(){
//   if (evt.currentTarget.value == "2030-D"){
//       updateGraph(myChart1,[[30,30000],[10,10],[1,1],[2,3]]);
//   }
//   else {
//       updateGraph(myChart1,[[300,30],[100,10],[100,1],[200,3]]);
//  }
// }


on(dom.byId("select_scenario_2"), "change", lang.hitch(this, function(evt){
  var id_viewer = "select_scenario_2";
  changeScenario(id_viewer, evt.currentTarget.value);
  scenario_labels[1] = evt.currentTarget.value;
  //change_data(scenario_labels[1], 1);

  if (evt.currentTarget.value == "2020-P"){ //As Built Conditions
    //updateGraph(myChartSpace1,[[190,920,530,440]]); I don't need to update this one on this end
    updateGraph(myChartSpace1,[[120,0,0,0,969,37638,0,1393,0,0]]);
    updateGraph(myChartPop,[[(resArray[0][0]),(resArray[0][1],508)],[(resArray[1][0]),(resArray[1][1],242)],[(resArray[2][0]),(resArray[2][1],2041)],[(resArray[3][0]),(resArray[3][1],1335)]]);
    updateGraph(myChartVehicle,[[(vehicleArray[0][0]),(vehicleArray[0][1],1583)],[(vehicleArray[1][0]),(vehicleArray[1][1],1458)],[(vehicleArray[2][0]),(vehicleArray[2][1],72)],[(vehicleArray[3][0]),(vehicleArray[3][1],44)],[(vehicleArray[4][0]),(vehicleArray[4][1],20)],[(vehicleArray[5][0]),(vehicleArray[5][1],42)]]); //Left side: Bike AM = 99, PM = 199, Car AM = 299, PM = 399, Bike AM - 499, PM = 599
    updateText1(myChartPop,"As Built");
    updateText1(myChartSpace1, "As Built");
    updateText1(myChartVehicle, "As Built");
    resArray[0][1] = 508; //change this as well as the value above (the one above sets the value temporarily. This replaces the value in the array.
    resArray[1][1] = 242;
    resArray[2][1] = 2041;
    resArray[3][1] = 1335;
    // spaceArrayCurr1 = [901,60,3210,4]

    vehicleArray[0][1] = 1583;
    vehicleArray[1][1] = 1458;
    vehicleArray[2][1] = 72;
    vehicleArray[3][1] = 44;
    vehicleArray[4][1] = 20;
    vehicleArray[5][1] = 42;
  }
  else if (evt.currentTarget.value == "2030-D"){ //Developer Proposal
    //updateGraph(myChartSpace1,[[190,920,530,440]]); I don't need to update this one on this end
    updateGraph(myChartSpace1,[[0,437,8433,0,2995,0,437075,2632,0,0]]);
    updateGraph(myChartPop,[[(resArray[0][0]),(resArray[0][1],16198)],[(resArray[1][0]),(resArray[1][1],7714)],[(resArray[2][0]),(resArray[2][1],60)],[(resArray[3][0]),(resArray[3][1],3547)]]);
    updateGraph(myChartVehicle,[[(vehicleArray[0][0]),(vehicleArray[0][1],2249)],[(vehicleArray[1][0]),(vehicleArray[1][1],2254)],[(vehicleArray[2][0]),(vehicleArray[2][1],375)],[(vehicleArray[3][0]),(vehicleArray[3][1],376)],[(vehicleArray[4][0]),(vehicleArray[4][1],54)],[(vehicleArray[5][0]),(vehicleArray[5][1],54)]]); //Left side: Bike AM = 99, PM = 199, Car AM = 299, PM = 399, Bike AM - 499, PM = 599
    updateText1(myChartPop,"Developer");
    updateText1(myChartSpace1, "Developer");
    updateText1(myChartVehicle, "Developer");
    resArray[0][1] = 16198; //change this as well as the value above (the one above sets the value temporarily. This replaces the value in the array.
    resArray[1][1] = 7714;
    resArray[2][1] = 60;
    resArray[3][1] = 3547;
    // spaceArrayCurr1 = [11,260,10,10]
    vehicleArray[0][1] = 2249;
    vehicleArray[1][1] = 2254;
    vehicleArray[2][1] = 375;
    vehicleArray[3][1] = 376;
    vehicleArray[4][1] = 54;
    vehicleArray[5][1] = 54;
  }
  else if (evt.currentTarget.value == "e1_2030_d1"){ //Alternate Design
    //updateGraph(myChartSpace1,[[190,920,530,440]]); I don't need to update this one on this end
    updateGraph(myChartSpace1,[[1821,7388,13942,3367,2721,66975,171882,15982,3642,11495]]);
    updateGraph(myChartPop,[[(resArray[0][0]),(resArray[0][1],4183)],[(resArray[1][0]),(resArray[1][1],1865)],[(resArray[2][0]),(resArray[2][1],2942)],[(resArray[3][0]),(resArray[3][1],3846)]]);
    updateGraph(myChartVehicle,[[(vehicleArray[0][0]),(vehicleArray[0][1],2159)],[(vehicleArray[1][0]),(vehicleArray[1][1],1888)],[(vehicleArray[2][0]),(vehicleArray[2][1],360)],[(vehicleArray[3][0]),(vehicleArray[3][1],315)],[(vehicleArray[4][0]),(vehicleArray[4][1],51)],[(vehicleArray[5][0]),(vehicleArray[5][1],45)]]); //Left side: Bike AM = 99, PM = 199, Car AM = 299, PM = 399, Bike AM - 499, PM = 599
    updateText1(myChartPop,"Alternative");
    updateText1(myChartSpace1, "Alternative");
    updateText1(myChartVehicle, "Alternative");
    resArray[0][1] = 4183; //change this as well as the value above (the one above sets the value temporarily. This replaces the value in the array.
    resArray[1][1] = 1865;
    resArray[2][1] = 2942;
    resArray[3][1] = 3846;
    // spaceArrayCurr1 = [121,60,130,340]
    vehicleArray[0][1] = 2159;
    vehicleArray[1][1] = 1888;
    vehicleArray[2][1] = 360;
    vehicleArray[3][1] = 315;
    vehicleArray[4][1] = 51;
    vehicleArray[5][1] = 45;
  }
  else {
    updateGraph(myChartSpace1,[[10,10,10,10]]);
  }



}));



//Update scenario charts (right now labels)
// function change_data(label, index){
// 	resEnergy.data.labels[index] = label;
// 	resEnergy.update();
// 	comEnergy.data.labels[index] = label;
// 	comEnergy.update();
// }


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

//DK check for selected value
// var e_dk = document.getElementById("select_scenario_1");
// var value_dk = e_dk.value;
// var text_dk = e_dk.options[e_dk.index].text;




const ctx = document.getElementById('ResPopulation').getContext('2d');
  myChartPop = new Chart(ctx, {
    type: 'bar',
    data: {
        //labels: ['Current', 'Proposed'],
        labels: [selectedTextL, selectedTextR],
        datasets: [{
            label: 'Population',
            data: [508, 16198],
            backgroundColor: [
                'rgba(50,136,189, 1)',
                'rgba(50,136,189, 1)'
            ],
            borderColor: [
                'rgba(255,255,255, 0)',
                'rgba(255,255,255, 0)'
            ],
            borderWidth: 1,
            barThickness: 30,


        },
        {
            label: 'Dwellings',
            data: [242, 7714],
            backgroundColor: [
                'rgba(103,195,166, 1)',
                'rgba(103,195,166, 1)'
            ],
            borderColor: [
                'rgba(255,255,255, 0)',
                'rgba(255,255,255, 0)'
            ],
            borderWidth: 1,
            barThickness: 30,


        },
        {
            label: 'Jobs',
            data: [2041, 60],
            backgroundColor: [
                'rgba(173,216,164, 1)',
                'rgba(173,216,164, 1)'
            ],
            borderColor: [
                'rgba(255,255,255, 0)',
                'rgba(255,255,255, 0)',
            ],
            borderWidth: 1,
            barThickness: 30,


        },
        {
            label: 'Parking',
            data: [1335, 3547],
            backgroundColor: [
                'rgba(228,235,154, 1)',
                'rgba(228,235,154, 1)'
            ],
            borderColor: [
                'rgba(255,255,255, 0)',
                'rgba(255,255,255, 0)'
            ],
            borderWidth: 1,
            barThickness: 30,


        }
      ]
    },
    options: {
      plugins: {
        "legend": {
          "display": true,
          "position": "bottom",
          "align": "center",

          "labels": {
                "color": 'rgba(205,205,212,0.6)',
                "boxWidth": 12
          }


        }},
        scales: {
            y: {
                beginAtZero: true,
                display: true,
                grid: {color: 'rgba(205,205,212,0.2)'},
                ticks: {color: 'rgba(205,205,212,0.6)',
                font: {size: 14}}
            },
            x:{
              grid: {color: 'rgba(205,205,212,0.2)'},
              ticks: {color: 'rgba(205,205,212,0.6)',
              font: {size: 14}}
            }
        },
        responsive: true,
        maintainAspectRatio: false,
}});



const ctx1 = document.getElementById('SpaceUse').getContext('2d');
  myChartSpace = new Chart(ctx1, {
  type: 'pie',
  data: {
      labels: ['Child Care (sq. m)', 'Community (sq. m)', 'Greenspace (sq. m)', 'Library (sq. m)', 'Mechanical (sq. m)', 'Office (sq. m)', 'Residential (sq. m)', 'Retail (sq. m)', 'School (sq. m)', 'Services (sq. m)'],
      datasets: [{
          label: 'Parking',
          data: [120,0,0,0,969,37638,0,1393,0,0],
          backgroundColor: [
            // 'rgba(250,173,97)',
            // 'rgba(192,174,213)',
            // 'rgba(173,216,164)',
            // 'rgba(95,80,161)',
            // 'rgba(201,203,207)',
            // 'rgba(50,136,189)',
            // 'rgba(253,248,193)',
            // 'rgba(216,63,80)',
            // 'rgba(103,195,166)',
            // 'rgba(159,27,69)'
              'rgba(249,158,67)',
              'rgba(192,174,213)',
              'rgba(164,206,75)',
              'rgba(126,105,174)',
              'rgba(201,203,207)',
              'rgba(70,159,216)',
              'rgba(255,205,87)',
              'rgba(241,98,132)',
              'rgba(76,192,192)',
              'rgba(191,59,96)'

          ],
          borderColor: [
            'rgba(33,36,55,1)'
          ],
          borderWidth: 0.4,
          barThickness: 60
      }
    ]
  },
  options: {
    cutout: '40%', //how big is the hole in the doughnut
    responsive: true,
    plugins: {
      legend: {
        display: false,
        position: 'bottom',
      },
      title: {
        display: true,
        text: selectedTextL,
        position: 'bottom',
        color: 'rgba(205,205,212,0.6)',
        font: {size: 14, weight: 'normal'}
      }
    }
  },
});

const ctx6 = document.getElementById('SpaceUse1').getContext('2d')
  myChartSpace1 = new Chart(ctx6, {
  type: 'doughnut',
  data: {
    labels: ['Child Care (sq. m)', 'Community (sq. m)', 'Greenspace (sq. m)', 'Library (sq. m)', 'Mechanical (sq. m)', 'Office (sq. m)', 'Residential (sq. m)', 'Retail (sq. m)', 'School (sq. m)', 'Services (sq. m)'],
    datasets: [{
        label: 'Parking',
        data: [0,437,8433,0,2995,0,437075,2632,0,0],
          backgroundColor: [
            'rgba(249,158,67)',
            'rgba(192,174,213)',
            'rgba(164,206,75)',
            'rgba(126,105,174)',
            'rgba(201,203,207)',
            'rgba(70,159,216)',
            'rgba(255,205,87)',
            'rgba(241,98,132)',
            'rgba(76,192,192)',
            'rgba(191,59,96)'
          ],
          borderColor: [
            'rgba(33,36,55,1)'
          ],
          borderWidth: 0.4,
          barThickness: 60
      }
    ]
  },
  options: {
    cutout: '40%', //how big is the hole in the doughnut
    responsive: true,
    plugins: {
      legend: {
        display: false,
        position: 'bottom',

      },
      title: {
        display: true,
        text: selectedTextR,
        position: 'bottom',
        color: 'rgba(205,205,212,0.6)',
        font: {size: 14, weight: 'normal'}
      }
    }
  },
});


// myChart1 = new Chart(ctx1, {
//   type: 'bar',
//     data: {
//         labels: ['Current', 'Proposed'],
//         datasets: [{
//             label: 'Parking',
//             data: [1,1],
//             backgroundColor: [
//                 'rgba(177, 175, 255,1)',
//                 'rgba(177, 175, 255,1)'
//             ],
//             borderColor: [
//                 'rgba(69, 74, 105, .5)',
//                 'rgba(69, 74, 105, .5)'
//             ],
//             borderWidth: 2,
//             barThickness: 60
//         },
//         {
//             label: 'Office',
//             data: [1,1],
//             backgroundColor: [
//                 'rgba(184, 232, 252,1)',
//                 'rgba(184, 232, 252,1)'
//             ],
//             borderColor: [
//                 'rgba(69, 74, 105, .5)',
//                 'rgba(69, 74, 105, .5)'
//             ],
//             borderWidth: 2,
//             barThickness: 60
//         },
//         {
//             label: 'Commerial',
//             data: [1,1],
//             backgroundColor: [
//                 'rgba(200, 255, 212,1)',
//                 'rgba(200, 255, 212,1)'
//             ],
//             borderColor: [
//                 'rgba(69, 74, 105, .5)',
//                 'rgba(69, 74, 105, .5)'
//             ],
//             borderWidth: 2,
//             barThickness: 60
//         },
//         {
//             label: 'Residential',
//             data: [1,1],
//             backgroundColor: [
//                 'rgba(253, 253, 189,1)',
//                 'rgba(253, 253, 189,1)'
//             ],
//             borderColor: [
//                 'rgba(69, 74, 105, .5)',
//                 'rgba(69, 74, 105, .5)'
//             ],
//             borderWidth: 2,
//             barThickness: 60
//         }
//       ]
//     },
//     options: {
//      plugins: {
//        "legend": {
//          "display": true,
//          "position": "right",
//          "align": "center",
//          "labels": {
//                "color": 'rgba(205,205,212,0.6)'
//          }
//        },
//
//        title: {
//          display: false,
//          text: 'Chart.js Bar Chart - Stacked'
//        },
//      },
//      responsive: true,
//      maintainAspectRatio: false,
//
//      scales: {
//        x: {
//          stacked: true,
//          grid: {color: 'rgba(205,205,212,0.6)'},
//          ticks: {color: 'rgba(205,205,212,0.6)',
//          font: {size: 14}}
//        },
//        y: {
//          stacked: true,
//          grid: {color: 'rgba(205,205,212,0.6)'},
//          ticks: {color: 'rgba(205,205,212,0.6)',
//          font: {size: 14}}
//        }
//      },
//     },
//
// });


const ctx2 = document.getElementById('VehicleTrips').getContext('2d');
  myChartVehicle = new Chart(ctx2, {
  type: 'bar',
    data: {
        labels: [selectedTextL, selectedTextR],
        datasets: [{
            label: 'Car AM',
            data: [1583,2249],
            backgroundColor: [

                'rgba(253,223,138,1)',
                'rgba(253,223,138,1)',
            ],
            stack: 'Stack 0',
            borderColor: [
                'rgba(253,248,193,0)',
                'rgba(253,248,193,0)'
            ],
            borderWidth: 1,
            barThickness: 50
        },
        {
            label: 'Car PM',
            data: [1458,2254],
            backgroundColor: [
              'rgba(253,248,193,1)',
              'rgba(253,248,193,1)'
            ],
            stack: 'Stack 0',
            borderColor: [
                'rgba(243,109,68,0)',
                'rgba(250,173,97,0)'
            ],
            borderWidth: 1,
            barThickness: 50
        },
        {
            label: 'Bus AM',
            data: [72,375],
            backgroundColor: [

                'rgba(243,109,68,1)',
                'rgba(243,109,68,1)'
            ],
            stack: 'Stack 1',
            borderColor: [
                'rgba(69, 74, 105, 0)',
                'rgba(69, 74, 105, 0)'
            ],
            borderWidth: 1,
            barThickness: 50
        },
        {
            label: 'Bus PM',
            data: [44,376],
            backgroundColor: [
              'rgba(250,173,97,1)',
              'rgba(250,173,97,1)'
            ],
            stack: 'Stack 1',
            borderColor: [
                'rgba(69, 74, 105, 0)',
                'rgba(69, 74, 105, 0)'
            ],
            borderWidth: 1,
            barThickness: 50
        },
        {
            label: 'Bike AM',
            data: [20,54],
            backgroundColor: [

                'rgba(157,27,69,1)',
                'rgba(157,27,69,1)'
            ],
            stack: 'Stack 2',
            borderColor: [
                'rgba(69, 74, 105, 0)',
                'rgba(69, 74, 105, 0)'
            ],
            borderWidth: 1,
            barThickness: 50
        },
        {
            label: 'Bike PM',
            data: [42,54],
            backgroundColor: [
              'rgba(213,63,80,1)',
              'rgba(213,63,80,1)'
            ],
            stack: 'Stack 2',
            borderColor: [
                'rgba(69, 74, 105, 0)',
                'rgba(69, 74, 105, 0)'
            ],
            borderWidth: 1,
            barThickness: 50
        }
      ]
    },
    options: {
    plugins: {
        "legend": {
          "display": true,
          "position": "bottom",
          "align": "center",
          "labels": {
                "color": 'rgba(205,205,212,0.6)',
                "boxWidth": 12
          }
        },

      title: {
        display: false,
        text: 'Chart.js Bar Chart - Stacked'
      },
    },
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
    },
    scales: {
      x: {
        stacked: true,
        grid: {color: 'rgba(205,205,212,0.2)'},
        ticks: {color: 'rgba(205,205,212,0.6)',
        font: {size: 14}},
      },
      y: {
        stacked: true,
        grid: {color: 'rgba(205,205,212,0.2)'},
        ticks: {color: 'rgba(205,205,212,0.6)',
        font: {size: 14}},
      }
},
  },
});


// const ctx3 = document.getElementById('DelSpaceUse1').getContext('2d');
// const myChart3 = new Chart(ctx3, {
//   type: 'bar',
//     data: {
//         labels: ['Current', 'Proposed'],
//         datasets: [{
//             label: 'Parking',
//             data: [12, 19],
//             backgroundColor: [
//                 'rgba(198,199,201,1)',
//                 'rgba(198,199,201,1)'
//             ],
//             borderColor: [
//                 'rgba(69, 74, 105, .5)',
//                 'rgba(69, 74, 105, .5)'
//             ],
//             borderWidth: 2,
//             barThickness: 60
//         },
//         {
//             label: 'Office',
//             data: [12, 19],
//             backgroundColor: [
//                 'rgba(2,197,141,1)',
//                 'rgba(2,197,141,1)'
//             ],
//             borderColor: [
//                 'rgba(69, 74, 105, .5)',
//                 'rgba(69, 74, 105, .5)'
//             ],
//             borderWidth: 2,
//             barThickness: 60
//         },
//         {
//             label: 'Commerial',
//             data: [12, 19],
//             backgroundColor: [
//                 'rgba(251,83,83,1)',
//                 'rgba(251,83,83,1)'
//             ],
//             borderColor: [
//                 'rgba(69, 74, 105, .5)',
//                 'rgba(69, 74, 105, .5)'
//             ],
//             borderWidth: 2,
//             barThickness: 60
//         },
//         {
//             label: 'Residential',
//             data: [12, 19],
//             backgroundColor: [
//                 'rgba(252,190,44,1)',
//                 'rgba(252,190,44,1)'
//             ],
//             borderColor: [
//                 'rgba(69, 74, 105, .5)',
//                 'rgba(69, 74, 105, .5)'
//             ],
//             borderWidth: 2,
//             barThickness: 60
//         }
//       ]
//     },
//     options: {
//      plugins: {
//        "legend": {
//          "display": true,
//          "position": "right",
//          "align": "center",
//          "labels": {
//                "color": 'rgba(205,205,212,0.6)'
//          }
//        },
//
//        title: {
//          display: false,
//          text: 'Chart.js Bar Chart - Stacked'
//        },
//      },
//      responsive: true,
//      maintainAspectRatio: false,
//      scales: {
//        x: {
//          stacked: true,
//          grid: {color: 'rgba(205,205,212,0.6)'},
//          ticks: {color: 'rgba(205,205,212,0.6)',
//          font: { size: 14}},
//          },
//        y: {
//          stacked: true,
//          grid: {color: 'rgba(205,205,212,0.6)'},
//          ticks: {color: 'rgba(205,205,212,0.6)',
//          font: { size: 14}},
//          }
//       }
//     },
// });



updateGraph = function(chart, proximity){
	for (var index = 0; index < proximity.length; index++){
		chart.data.datasets[index].data = proximity[index];
	}
	chart.update();
}

updateText = function(chart, proximity){
  //for (var index = 0; index < proximity.length; index++){
    chart.data.labels[0] = proximity;
    //chart.options.plugins[0].title[0].text[0] = proximity;
    //alert(chart.options.plugins[0].title[0].text[0]);
    //chart.options.plugins.title.text = proximity;
    chart.options.plugins.title.text = proximity;
  //}
  chart.update();
  }


  updateText1 = function(chart, proximity){
    //for (var index = 0; index < proximity.length; index++){
      chart.data.labels[1] = proximity;
      chart.options.plugins.title.text = proximity;
      //chart.options.plugins.title[0].text[0] = proximity;

    //}
    chart.update();
    }















});
