var nools = require('nools');

exports.type = function(message, parent){

  var Output = function(message, parent){
    //try { this.parent = parent } catch(err){}
    try { this.name = message.input.name; } catch(err){}
    try { this.type = message.input.type; } catch(err){}
    try { this.id = message.input.id; } catch(err){}
    try { this.text = message; } catch(err){}
    try { this.personCount = message.input.payload.personCount; } catch(err){}
    //try { this.sequence = sequence; } catch(err){}
  };

  return Output;
}

var Result = function (result) {
  this.result = result || -1;
};

exports.flow = function(Output, actions){

  // Fetch the sessionKey from the session parent; it was written on DRBE init
  var sessionKeyValue = actions.getParentFact("sessionKey").value;

  var flow = nools.flow("Default", function(flow){

    // Assert Total Occupancy -- Bosch R&D Pittsburgh Strip, C/M Conference Room, left
    flow.rule("Occupancy:BoschStirpLeft:collect", [
      [Output, "m1", "m1.type =~ /^FORK$/", {sequence:"10"}]
      , [Output, "m1", "m1.id =~ /^FORK018003251847$/", {sequence:"100"}]
      //, [Result, "r"]
      ], function(facts){

      actions.log("MATCHED, \"occ:BoschStripLeft:collect\": "+facts.m1.text.input.id);
      //facts.r.result = facts.m1;

      var occTotLeft = actions.getParentFact("occTotBoschStripLeft")
      ,   occTotRight = actions.getParentFact("occTotBoschStripRight")
      ,   personCount = facts.m1.text.input.payload.personCount;

      if(!occTotLeft) {
        var occTot = {"type":"occTotBoschStripLeft","value":personCount};
        actions.parentSession.meta.assert(occTot);

        if(occTotRight){
          var occAggBoschStrip = personCount + occTotRight.value;
          actions.parentSession.meta.assert({"type":"occAggBoschStrip","value":occAggBoschStrip});
        }
      } else {
        occTotLeft.value = personCount;
        actions.parentSession.meta.modify(occTotLeft);
      }
    }); // */

    // Assert Total Occupancy -- Bosch R&D Pittsburgh Strip, C/M Conference Room, right
    flow.rule("Occupancy:BoschStripRight:collect", [
      [Output, "m1", "m1.type =~ /^FORK$/", {sequence:"10"}]
      , [Output, "m1", "m1.id =~ /^FORK003763250647$/", {sequence:"100"}]
      //, [Result, "r"]
      ], function(facts){

      actions.log("MATCHED, \"Occupancy:BoschStripRight:collect\": "+facts.m1.text.input.id);
      //facts.r.result = facts.m1;

      var occTotLeft = actions.getParentFact("occTotBoschStripLeft")
      ,   occTotRight = actions.getParentFact("occTotBoschStripRight")
      ,   personCount = facts.m1.text.input.payload.personCount;

      if(!occTotRight) {
        var occTot = {"type":"occTotBoschStripRight","value":personCount};
        actions.parentSession.meta.assert(occTot);

        if(occTotLeft){
          var occAggBoschStrip = personCount + occTotLeft.value;
          actions.parentSession.meta.assert({"type":"occAggBoschStrip","value":occAggBoschStrip});
        }

      } else {
        occTotRight.value = personCount;
        actions.parentSession.meta.modify(occTotRight);
      }
    }); // */

    // Realtime Occupancy Aggregation -- BoschStrip lab
    flow.rule("Occupancy:BoschStrip:aggregate", [
        [Output, "m1", "m1.type =~ /^FORK$/", {sequence:"10"}]
        , [Output, "m1", "m1.id =~ /^FORK_BOSCH_OFFICE_MAIN$/"]
      ], function(facts){

      var newOccTot
      ,   occChange = facts.m1.text.input.payload.occChange
      ,   aggObj = actions.getParentFact("occAggBoschStrip");

      if(Math.abs(occChange) && aggObj){

        // Calculate new total
        //newOccTot = aggObj.value + occChange;
        newOccTot = actions.getParentFact("occTotBoschStripLeft").value + actions.getParentFact("occTotBoschStripRight").value;

        // Update 'current' total in parent session..
        aggObj.value = (newOccTot < 0 ) ? 0 : newOccTot;
        actions.parentSession.meta.modify(aggObj);

        actions.log("MATCHED, \"occ:occTotBoschStrip:collect\": "+facts.m1.text.input.id);

        console.log("##### OCC CHANGE DETECTED. New AGG: "+aggObj.value);

        // Distribute 'personCount' message(s) to XMPP..
        actions.send({name:"xmpp-pubsub", loc:"FORK_BOSCH_OFFICE_MAIN", value: aggObj.value, itemid:"_Person Count", dataname:"Person Count"}, "{ \"id\": \"FORK_BOSCH_OFFICE_MAIN\", \"type\": \"FORK\", \"timestamp\":"+actions.moment().format()+", \"payload\": { \"Person Count\":"+ aggObj.value+", \"personCount\": "+aggObj.value+" } }", false);

        //actions.send({name: "xmpp-chat", location: "drbe@sensor.andrew.cmu.edu"}, "{ \"drbeSession\":"+actions.parentSession.key+", \"id\": \"FORK_SCAIFE_125\", \"type\": \"FORK\", \"timestamp\":"+actions.moment().format()+", \"payload\": { \"Person Count\":"+ aggObj.value+", \"personCount\": "+aggObj.value+" } }");
      }

    }); // */

    // Assert Total Occupancy -- Scaife Hall 125 (CMU), left
    flow.rule("Occupancy:Scaife125Left:collect", [
      [Output, "m1", "m1.type =~ /^FORK$/", {sequence:"10"}]
      , [Output, "m1", "m1.id =~ /^FORK015145551847$/", {sequence:"100"}]
      //, [Result, "r"]
      ], function(facts){

      actions.log("MATCHED, \"occ:Scaife125Left:collect\": "+facts.m1.text.input.id);
      //facts.r.result = facts.m1;

      var occTotLeft = actions.getParentFact("occTotScaifeLeft")
      ,   occTotRight = actions.getParentFact("occTotScaifeRight")
      ,   personCount = facts.m1.text.input.payload.personCount;

      if(!occTotLeft) {
        var occTot = {"type":"occTotScaifeLeft","value":personCount};
        actions.parentSession.meta.assert(occTot);

        if(occTotRight){
          var occAggScaife = personCount + occTotRight.value;
          actions.parentSession.meta.assert({"type":"occAggScaife","value":occAggScaife});
        }
      } else {
        occTotLeft.value = personCount;
        actions.parentSession.meta.modify(occTotLeft);
      }
    }); // */

    // Assert Total Occupancy -- Scaife Hall 125 (CMU), right
    flow.rule("Occupancy:Scaife125Right:collect", [
      [Output, "m1", "m1.type =~ /^FORK$/", {sequence:"10"}]
      , [Output, "m1", "m1.id =~ /^FORK010663545047$/", {sequence:"100"}]
      //, [Result, "r"]
      ], function(facts){

      actions.log("MATCHED, \"Occupancy:Scaife125Right:collect\": "+facts.m1.text.input.id);
      //facts.r.result = facts.m1;

      var occTotLeft = actions.getParentFact("occTotScaifeLeft")
      ,   occTotRight = actions.getParentFact("occTotScaifeRight")
      ,   personCount = facts.m1.text.input.payload.personCount;

      if(!occTotRight) {
        var occTot = {"type":"occTotScaifeRight","value":personCount};
        actions.parentSession.meta.assert(occTot);

        if(occTotLeft){
          var occAggScaife = personCount + occTotLeft.value;
          actions.parentSession.meta.assert({"type":"occAggScaife","value":occAggScaife});
        }

      } else {
        occTotRight.value = personCount;
        actions.parentSession.meta.modify(occTotRight);
      }
    }); // */

    // Realtime Occupancy Aggregation -- Scaife lab
    flow.rule("Occupancy:Scaife125:aggregate", [
        [Output, "m1", "m1.type =~ /^FORK$/", {sequence:"10"}]
        , [Output, "m1", "m1.id =~ /^FORK_SCAIFE_125$/"]
      ], function(facts){

      var newOccTot
      ,   occChange = facts.m1.text.input.payload.occChange
      ,   aggObj = actions.getParentFact("occAggScaife");

      if(Math.abs(occChange) && aggObj){

        // Calculate new total
        //newOccTot = aggObj.value + occChange;
        newOccTot = actions.getParentFact("occTotScaifeLeft").value + actions.getParentFact("occTotScaifeRight").value;

        // Update 'current' total in parent session..
        aggObj.value = (newOccTot < 0 ) ? 0 : newOccTot;
        actions.parentSession.meta.modify(aggObj);

        actions.log("MATCHED, \"occ:occTotScaife:collect\": "+facts.m1.text.input.id);

        console.log("##### OCC CHANGE DETECTED. New AGG: "+aggObj.value);

        // Distribute 'personCount' message(s) to XMPP..
        actions.send({name:"xmpp-pubsub", loc:"FORK_AGG_SCAIFE_125", value: aggObj.value, itemid:"_Person Count", dataname:"Person Count"}, "{ \"id\": \"FORK_AGG_SCAIFE_125\", \"type\": \"FORK\", \"timestamp\":"+actions.moment().format()+", \"payload\": { \"Person Count\":"+ aggObj.value+", \"personCount\": "+aggObj.value+" } }", false);

        //actions.send({name: "xmpp-chat", location: "drbe@sensor.andrew.cmu.edu"}, "{ \"drbeSession\":"+actions.parentSession.key+", \"id\": \"FORK_SCAIFE_125\", \"type\": \"FORK\", \"timestamp\":"+actions.moment().format()+", \"payload\": { \"Person Count\":"+ aggObj.value+", \"personCount\": "+aggObj.value+" } }");
      }

    }); // */

    /*/ Assert Total Occupancy -- Bosch lab
    flow.rule("Occupancy:Bosch:collect", [
      [Output, "m1", "m1.type =~ /^FORK$/", {sequence:"10"}]
      , [Output, "m1", "m1.id =~ /^FORK003763250647$/", {sequence:"100"}]
      //, [Result, "r"]
      ], function(facts){

      actions.log("MATCHED, \"occ:occAggBosch:collect\": "+facts.m1.text.input.id);
      //facts.r.result = facts.m1;

      if(!actions.getParentFact("occAggBosch")) {
        var occTot = {"type":"occAggBosch","value":facts.m1.text.input.payload.personCount};
        actions.parentSession.meta.assert(occTot);
      }
    }); // */

    // Assert Total Occupancy -- Bosch, main entrance
    flow.rule("Occupancy:BoschMain:collect", [
      [Output, "m1", "m1.type =~ /^FORK$/", {sequence:"10"}]
      , [Output, "m1", "m1.id =~ /^FORK003763250647$/", {sequence:"100"}]
      //, [Result, "r"]
      ], function(facts){

      actions.log("MATCHED, \"Occupancy:BoschMain:collect\": "+facts.m1.text.input.id);
      //facts.r.result = facts.m1;

      var occTotMain = actions.getParentFact("occTotBoschMain")
      ,   occTotCBS = actions.getParentFact("occTotBoschCBS")
      ,   personCount = facts.m1.text.input.payload.personCount;

      if(!occTotMain) {
        var occTot = {"type":"occTotBoschMain","value":personCount};
        actions.parentSession.meta.assert(occTot);

        if(occTotCBS){
          var occAggBosch = personCount + occTotCBS.value;
          actions.parentSession.meta.assert({"type":"occAggBosch","value":occAggBosch});
        }

      } else {
        occTotMain.value = personCount;
        actions.parentSession.meta.modify(occTotMain);
      }
    }); // */

    // Assert Total Occupancy -- Bosch, CBS entrance
    flow.rule("Occupancy:BoschCBS:collect", [
      [Output, "m1", "m1.type =~ /^FORK$/", {sequence:"10"}]
      , [Output, "m1", "m1.id =~ /^FORK018003251847$/", {sequence:"100"}]
      //, [Result, "r"]
      ], function(facts){

      actions.log("MATCHED, \"Occupancy:BoschCBS:collect\": "+facts.m1.text.input.id);
      //facts.r.result = facts.m1;

      var occTotMain = actions.getParentFact("occTotBoschMain")
      ,   occTotCBS = actions.getParentFact("occTotBoschCBS")
      ,   personCount = facts.m1.text.input.payload.personCount;

      if(!occTotCBS) {
        var occTot = {"type":"occTotBoschCBS","value":personCount};
        actions.parentSession.meta.assert(occTot);

        if(occTotMain){
          var occAggBosch = personCount + occTotMain.value;
          actions.parentSession.meta.assert({"type":"occAggBosch","value":occAggBosch});
        }

      } else {
        occTotCBS.value = personCount;
        actions.parentSession.meta.modify(occTotCBS);
      }
    }); // */

    // Realtime Occupancy Aggregation -- Bosch lab
    flow.rule("Occupancy:Bosch:aggregate", [
        [Output, "m1", "m1.type =~ /^FORK$/", {sequence:"10"}]
        , [Output, "m1", "m1.id =~ /^FORK_BOSCH_OFFICE_MAIN$/"]
      ], function(facts){

      var newOccTot
      ,   occChange = facts.m1.text.input.payload.occChange
      ,   aggObj = actions.getParentFact("occAggBosch");


      if(Math.abs(occChange) && aggObj){

        // Calculate new total
        //newOccTot = aggObj.value + occChange;
        newOccTot = actions.getParentFact("occTotBoschMain").value + actions.getParentFact("occTotBoschCBS").value;

        // Update 'current' total in parent session..
        aggObj.value = (newOccTot < 0 ) ? 0 : newOccTot;
        actions.parentSession.meta.modify(aggObj);

        actions.log("MATCHED, \"occ:occAggBosch:collect\": "+facts.m1.text.input.id);

        console.log("##### OCC CHANGE DETECTED. NEW AGG: "+aggObj.value);

        // Distribute 'personCount' message(s) to XMPP, via the pubsub tree..
        actions.send({name:"xmpp-pubsub", loc:"FORK_BOSCH_OFFICE_MAIN", value: aggObj.value, itemid:"_Person Count", dataname:"Person Count"}, "{ \"id\": \"FORK_BOSCH_OFFICE_MAIN\", \"type\": \"FORK\", \"timestamp\":"+actions.moment().format()+", \"payload\": { \"Person Count\":"+ aggObj.value+", \"personCount\": "+aggObj.value+" } }", false);

        //actions.send({name: "xmpp-chat", location: "drbe@sensor.andrew.cmu.edu"}, "{ \"id\": \"FORK_BOSCH_OFFICE_MAIN\", \"type\": \"FORK\", \"timestamp\":"+actions.moment().format()+", \"payload\": { \"Person Count\":"+ aggObj.value+", \"personCount\": "+aggObj.value+" } }");

      }

    }); // */

    // lab occupancy -- lightswitch -- off
    flow.rule("occupancy:light:OFF", [
      [Output, "m", "m.type =~ /^FORK$/", {sequence:"10"}]
      , [Output, "m", "m.id =~ /^FORK502460441942$/", {sequence:"100"}]
      , [Output, "m", "m.personCount < 1", {sequence:"1000"}]
    ], function(facts){
      actions.log("MATCHED, \"occ:light:OFF\" -- nodeID: "+facts.m.id);

      var options = {
        hostname: '192.168.1.109',
        port: 80,
        path: '/api/3909b2177ae707f2b4ce007281408f/lights/4/state',
        method: 'PUT'
      }

      actions.send({name:"http", options: options}, "{\"on\":false}", false);
    }) // */

    // lab occupancy -- lightswitch -- on
    flow.rule("occupancy:light:ON", [
      [Output, "m", "m.type =~ /^FORK$/"]
      , [Output, "m", "m.text.input.id =~ /^FORK502460441942$/"]
      , [Output, "m", "m.personCount > 0"]
    ], function(facts){
      actions.log("MATCHED, \"occ:light:ON\" -- nodeID: "+facts.m.id);

      var options = {
        hostname: '192.168.1.109',
        port: 80,
        path: '/api/3909b2177ae707f2b4ce007281408f/lights/4/state',
        method: 'PUT'
      }

      actions.send({name:"http", options: options}, "{\"on\":true}", false);

    }) // */

    flow.rule("Temperature", [Output, "m", "m.name =~ /^Temperature$/"], function(facts){
      console.log("MATCHED -- name: "+facts.m.name);
    });

    // chat commands -- hue light off
    flow.rule("chat:light:off", [Output, "m", "m.text.input =~ /^lightoff$/"], function(facts){
      actions.log("MATCHED, \"chat:light:OFF\" text: "+JSON.stringify(facts.m.text));
      actions.send({name: "xmpp-chat", location: "drbe@sensor.andrew.cmu.edu"}, "Light: OFF");

      var options = {
        hostname: '192.168.1.109',
        port: 80,
        path: '/api/3909b2177ae707f2b4ce007281408f/lights/4/state',
        method: 'PUT'
      }

      /*
      var m = actions.getParentFact("occTot");
      console.log("Occtot Object:"+JSON.stringify(m));
      actions.parentSession.meta.retract(m);
      */
      actions.send({name:"http", options:options}, "{\"on\":false}", false);
    }); // */

    // chat commands -- hue light on
    flow.rule("chat:light:on", [Output, "m", "m.text.input =~ /^lighton$/"], function(facts){
      actions.log("MATCHED, \"chat:light:ON\" text: "+JSON.stringify(facts.m.text));
      actions.send({name: "xmpp-chat", location: "drbe@sensor.andrew.cmu.edu"}, "Light: ON");

      var options = {
        hostname: '192.168.1.109',
        port: 80,
        path: '/api/3909b2177ae707f2b4ce007281408f/lights/4/state',
        method: 'PUT'
      }

      actions.send({name:"http", options:options}, "{\"on\":true}", false);
    }); // */

    // ADMIN COMMANDS
    //

    //dump facts
    flow.rule("chat:dumpfacts:true:", [Output, "m", "m.text.input =~ /^sys dumpfacts+/"], function(facts){
      actions.log("MATCHED, \"chat:dumpfacts:true\" -- text: "+facts.m.text);

      actions.log("### Facts: "+ JSON.stringify(facts))
    }); // */


    // SANBOX RULES...

    /*/ testing 'exists' constraint on facts in the PARENT's working memory session
    flow.rule("fork:boschmainocc:exists", [
      [Output, "m", "m.type =~ /^FORK$/"]
      , ["exists", Output, "m", "m.text.input == actions.getParentFact('sessionKey')"]
    ], function(facts){
        console.log("#### SESSION -- yes! Session key exists.");
    });
    // */
  });

  return flow;

};
