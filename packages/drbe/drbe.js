/*/
 * Jon Francis -- jon.francis@us.bosch.com
 * RuleEngine middleware for CR/PJ-TOP75 and CR/SP12-014.
 *
 * This is a custom RuleEngine middleware server/daemon, developed specifically for Bosch Research projects, CR/PJ-TOP75 (TWIST) and CR/SP12-014 (Smart Campus). The underlying library is Nools (https://github.com/C2FO/nools), which is a NodeJS port of Drools. Drools is one of the more popular BMS-RE's that are based off the Rete algorithm for data pattern-matching. This application instantiates a number of sockets (HTTP from NodeJS core, UDP from 'dgram' as part of NodeJS core, XMPP from https://github/node-xmpp/node-xmpp), interfaces with several visualisation clients using self-defined protocols, and dynamically actuates available devices over XMPP (https://www.ejabberd.im) on the SensorAndrew network (http://dev.mortr.io)
 *
 * Within CR/SP12-014, we are operating on a multi-instance RBE model, where each instance is differentiated from the others by the scope/namespace of the devices under its purview. Whereas each root or parent in the XMPP data tree hierarchy (e.g., campus, building, floor, etc.) has a "main" RBE instance that arbitrates "global" transducers, there may also exist several "minor" RBE instances to arbitrate devices owned by individual XMPP end-user accounts (depending on the EU's role, access privileges, state, location, and so forth).
 *
/*/

// Libraries.
var nools = require('nools')
  , http = require('http')
  , XMPPClient = require('node-xmpp-client')
  , ltx = require('ltx')
  , fs = require('fs')
  , udp = require('dgram') // user datagram protocol
  , winston = require('winston') // a multi-transport async logging library
  , moment = require('moment') // parse/validate/manipulate/display dates
  , stdio = require('stdio') // commandline argument interface
  , uuid = require('uuid');
  // add timed-event/CRON functionlity -- node-schedule, timers (native), etc

var initTime = moment().format();

// Util data.
var argv = process.argv
  , sessionKey = moment().format('YYYYMMDhhmmss')+'-'+uuid.v1()//Math.ceil(Math.random() * 99999)
  , conf = require("./drbe.config").config(sessionKey, stdio, argv)
  , globalJID = conf.xmppUser+"@"+conf.xmppDomain;//+"/drbe"+Math.ceil(Math.random() * 99999);

// Method initialisation.

var logger = (conf.loggingEnabled) ? new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      handleExceptions: true,
      json: true
    })
    , new (winston.transports.File)({
      filename: conf.logfile
    })
  ]
}) : new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      handleExceptions: true,
      json: true
    })
  ]
});

var storage = new (winston.Logger)({
  transports: [
    new (winston.transports.Console)({
      handleExceptions: true,
      json: true
    })
    , new (winston.transports.File)({
      filename: conf.storefile
    })
  ]
})

// getParentFact()
//
// Supply fact type, get the fact object from the parents session scope, if exists.
// Otherwise, the function returns false.
function getParentFact(type) {
  try {
    var obj = sessionParent.meta.getFacts().filter(function(a){return a.type == type})[0];
    return obj;
  } catch(err) {
    return false;
  }
}

// send()
//
// This is the Rule Engine's main output transport, specified by resource.method, where:
//    -- resource: string, name of transmission type (e.g., xmpp-chat, udp, default, etc)
//    -- message: string, message to be transmitted (usually a JSON-formatted string)
//    -- predefined: boolean, describing whether resource already has a configfile entry
//
//    e.g. -- named resource
//      send({ name: "bimServer" }, message, true);
//
//    e.g. -- unnamed resource
//      send({ name: "xmpp-chat", location: "someone@xmpp.org" }, payload, false);
//
//    e.g. -- unnamed resource, pubsub
//      send({ name: "xmpp-pubsub", location: "someNodeID" }, payload, false);
function send(resource, message, predefined) {

  if(predefined){ // let's lookup the method in the config file!
    resource = conf.clients[resource.name]; // recursive lookup transformation from object ref to object
    message = resource.makePacket(message); // encapsulate payload with resource-specific packet information

    if(resource.active){ // resources defined inthe configuration must have an 'active' attribute
      return logger.error("(Nools - send) "+resource.method+"-based resource not active; change the config setting");
    }
  } else {
    resource.method = resource.name;
  }

  var method = {
    'xmpp-chat' : function(res) {
      var stanza = new ltx.Element('message',{
        to: resource.location,
        from: conf.xmppJID,
        type: 'chat'
      })
      stanza.c('body').t(message)
      xmppClient.send(stanza)
      return logger.info("(Nools - send) \""+message+"\" sent to \""+resource.location+"\" via "+resource.method);
    },
    'xmpp-pubsub' : function(res) {
      var stanza = new ltx.Element('iq',{
        to: "pubsub."+conf.xmppDomain,
        from: globalJID,
        type: 'set',
        id: 're-pubsub1'
      }), stanza2 = new ltx.Element('iq',{
        to: "pubsub."+conf.xmppDomain,
        from: globalJID,
        type: 'set',
        id: 're-pubsub1'
      });


      stanza.c('pubsub', { xmlns:'http://jabber.org/protocol/pubsub' })
            .c('publish', { node: resource.loc})
            .c('item', {id: '_Summary'})
            .c('transducerDataJSON', {timestamp: moment().format()})
            .c('entry', { xmlns:'http://www.w3.org/2005/Atom' }).t(message)

      stanza2.c('pubsub', { xmlns:'http://jabber.org/protocol/pubsub' })
             .c('publish', { node: resource.loc})
             .c('item', {id: resource.itemid})
             //.c('entry', { xmlns:'http://www.w3.org/2005/Atom' })
             .c('transducerData', {value: resource.value, name: resource.dataname, timestamp: moment().format()})


      logger.info("#### PUBLISHED STANZA: "+stanza2.toString());

      xmppClient.send(stanza2)
      return logger.info("(Nools - send) \""+message+"\" sent to \""+resource.loc+"\" via "+resource.method);
    },
    'xmpp-transducer' : function(res) {
      var stanza = new ltx.Element('message',{
        to: resource.location,
        from: conf.xmppJID,
        type: 'pubsub'
      })
      //stanza.c('body').t(message)
      //xmppClient.send(stanza)
      return logger.info("(Nools - send) \""+message+"\" sent to \""+resource.location+"\" via "+resource.method);
    },
    'http' : function(res) {

      var req = http.request(resource.options, function(resp){
        logger.info('STATUS: ' + resp.statusCode);
        logger.info('HEADERS: ' + JSON.stringify(resp.headers));
      })

      req.on('error', function(err){
        return logger.info("Otherwise fatal error, HTTP:" + err);
      });

      req.write(message);
      // Consider asserting the HTTP response, for feedback control
      req.end();

      return logger.info("(Nools - send) \""+message+"\" sent to \""+resource.options.path+"\" via "+resource.method);
    },
    'udp' : function(res) {

      if(conf.udpcred.host){

        udpServer.send(message, 0, message.length, res.location.host, res.location.port, function(err){
          if(err) logger.error(err)
          logger.info("(Nools - send) \""+message+"\" sent to \""+resource.location+"\" via "+resource.method);
        });

      } else {

        logger.info("(Nools - send) Cannot send UDP message; socket not initialised. You will need to re-initislise DRBE with the UDP flag and credentials.");

      }
    }
  }

  // execute.
  method[resource.method](resource.name)
}

// getStanzaElements()
//
// Parse stanza, based on message type, and return the notable elements
function getStanzaElements(stanza){
  try{
  var stanzaType = stanza.attrs.type || "headline";
  } catch(err){
    console.log(err);
  }
  var processedInput;
  var parseMethod = {
    'headline' : function(stanza){

      var output = [],pOutput,pout,key=0;

      // make the stanza root a "class", since traversal mutates the object tree cursor
      function StanzaRoot(root){
        var stanzaCopy = root;

        return stanzaCopy.root().getChild('event').getChild('items');

      }

      // filter --> return the valid element
      function sift(obj){
        if(obj !== undefined){
          //logger.info(obj)
          pout = obj;
          return true;
        } else {
          return false;
        }
      }

      //logger.info("in ##################");
      try{ output[0] = (new StanzaRoot(stanza)).getChild('item').getChild('transducerData').attrs } catch(err){}
      try{ output[1] = (new StanzaRoot(stanza)).getChild('item').getChild('transducerValue').attrs } catch(err){}
      try{ output[2] = JSON.parse((new StanzaRoot(stanza)).getChildByAttr("id","_Summary").getChildText("transducerDataJSON")) } catch(err){}
      try{ output[3] = (new StanzaRoot(stanza)).getChild('item').getChild('data') } catch(err){}
      try{ output[4] = (new StanzaRoot(stanza)).getChild('item').getChild('meta') } catch(err){}
      try{ output[5] = (new StanzaRoot(stanza)).getChild('item').getChild('addresses') } catch(err){}
      try{ output[6] = (new StanzaRoot(stanza)).getChild('item').getChild('references') } catch(err){}

      output.filter(sift);
      //logger.info("aus ##################");

      return pout;
    },
    'chat'  : function(stanza){
       return stanza.getChildText('body') || "empty";
    },
    'error' : function(stanza){
       return stanzaType;
    },
    'drbe_act': function(stanza){
      var input = stanza.getChildText('body');
      input = JSON.parse(processedInput) || "invalid";
      return input
    }
  };

  //console.log("(Nools - getStanzaElements) Got new message of type, \'"+stanzaType+"\'.");

  try{
    processedInput = parseMethod[stanzaType](stanza);
    return { type: stanzaType, input: processedInput };

  } catch(err){
    logger.error(err);
    return { type: stanzaType, input: processedInput};
  }
}

// system(cmd)
//
// Handle incoming DRBE actuation commands (via PUBSUB)
function system(cmd){

  if(/* (cmd.sessionKey == conf.sessionKey) && */(cmd.type == 'drbe_act')){
    var action = {
      'rulestream' : function(){
        // expecting cmd = { type: "rulestream", rule: {} }
        logger.info("(Nools - System) Received system command - rulestream | "+cmd.payload)
        logger.info("(Nools - System) Attempting to read in rule...", { meta: cmd.payload.rule.name+cmd.payload.rule.constraints+cmd.payload.rule.action });

        // Add rule to compiled flow
        try {

          var Output = function(cmd){
            try { this.name = cmd.name; } catch(err){}
            try { this.type = cmd.type; } catch(err){}
            try { this.id = cmd.id; } catch(err){}
            try { this.text = cmd; } catch(err){}
            try { this.personCount = cmd.payload.personCount; } catch(err){}
            //try { this.sequence = sequence; } catch(err){}
          };

          //
          //var arrayInput = "[ruletype, \"m\", \"m.text.input =~ /^rsrdumpfacts+/\"]";
          var arrayInput = cmd.payload.rule.constraints;
          var arrayParsed = eval(arrayInput);

          //
          //var functionInput = "function(facts){console.log(\"MATCHED, chat:dumpfracts:rsr:true:prog - text\");console.log(\"### FACTS: \");}";
          var functionInput = cmd.payload.rule.action;
          var functionParsed = eval("(" + functionInput + ")");
          // */

          /*/
          flow.rule(cmd.payload.rule.name, [ruletype, "m", "m.text.input =~ /^rsrdumpfacts+/"], function(facts){

            console.log("MATCHED, \"chat:dumpfacts:rsr:true\" -- text");

            console.log("### Facts: ")

          }); // */

          //
          flow.rule(cmd.payload.rule.name, arrayParsed, functionParsed); // */

          var fetchrule = flow.__rules.filter(function(a){return a.name == 'chat:dumpfacts:true:'})[0]

          var outputInstance = new Output(cmd);

          logger.info(fetchrule);
          console.log(flow.__rules);
          console.log("OUTPUT " + JSON.stringify(outputInstance.text));
          console.log("ARRAY ", arrayParsed[0]);

        } catch(err) {

          logger.info("(System - Rulestream) ERROR: "+err);
          send({name: "xmpp-chat", location: "",}, "(DRBE - System - Rulestream) Parsing rule was not successful.", false);

        }

        // Add this rule to the Nools global compiled flow
        //flow.addRule(cmd.newRule);
        //session = flow.getSession('output');
      },
      'spawn' : function(){
        // expecting cmd = { type: "spawnInstance", meta: {} }
        logger.info('(Nools - System) Received system command: spawn')
        ;
      },
      'clone': function(){
        // expecting cmd = {type: "gatewayHandoff", meta: {} }
        logger.info("(Nools - System) Received system command - clone")
        ;
      },
      'subscribe' : function(){
        // instruct DRBE instance to subscribe to a node
        logger.info("(Nools - System) Received system command - subscribe")

        var message_sub_node = new ltx.Element('iq',{
          to: 'pubsub.'+conf.xmppDomain,
          from: globalJID,
          type: 'set'
        })
        message_sub_node.c('pubsub', { xmlns:'http://jabber.org/protocol/pubsub'})
          .c('subscribe', { node: cmd.payload.nodeId, jid: globalJID})
        xmppClient.send(message_sub_node)

        logger.info("(Nools - System) Subscription request sent to node: "+ cmd.payload.nodeId);

      },
      'dumpfacts' : function(){

        logger.info("(Nools - System) Received system command - dumpfacts");
        logger.info(sessionParent.meta.getFacts());

      }
    };

    // execute.
    action[cmd.command]()

  } else {
    logger.info("(Nools - Runtime) Session key used for ACT request is incorrect.")
  }

}

//include rulesbase, link actuation functions..
var sessionParent = {meta:"", key:sessionKey}
,   ruletype = require("./"+conf.rulesfile).type()
,   flow = require("./"+conf.rulesfile).flow(ruletype, {"send":send, "store":storage.info, "log":logger.info, "system":system, "getParentFact":getParentFact, "parentSession":sessionParent, "moment":moment});

//flow.conflictResolution(["salience", "factRecency", "activationRecency"]);

// Create a new session for the parent and update the object attribute
sessionParent.meta = flow.getSession();

if(conf.udpcred.host){

  // Initialise UDP server.
  var udpServer = udp.createSocket('udp4');

  udpServer.on('listening', function(){
    var address = udpServer.address();
    logger.info("(Nools - init) UDP: Connected, listening at "+address.address+":"+address.port);
  });

  udpServer.on('message', function(message, remote){
    logger.info(remote.address + ':' + remote.port + ' - ' + message);
  });
  udpServer.bind(conf.udpcred.port, conf.udpcred.host);

} else {

    logger.info("(Nools - init) UDP: Disabled.");

}


// Initialise XMPP client.
xmppClient = new XMPPClient({
  jid: globalJID,
  password: conf.xmppPass
  //subscribe: conf.subscribe
})

xmppClient.on('online', function() {
  logger.info("(Nools - init) Connected to XMPP, with JID: "+globalJID);
  logger.info("(Nools - init) DRBE type/scope defined as: "+conf.meta.type);
  logger.info("(Nools - init) DRBE mounted at: "+conf.meta.geoloc);
  logger.info("(Nools - init) Application version is: "+conf.appVersion+".");
  logger.info("(Nools - init) Session Key is "+conf.sessionKey+".");
  logger.info("(Nools - init) Rulesfile: "+conf.rulesfile+".");
  logger.info("(Nools - init) Logfile: "+conf.logfile+".");
  logger.info("(Nools - init) Persistent?: "+conf.meta.persistent+".");

  //logger.info(xmppClient.options.subscribe);

  xmppClient.send( new ltx.Element('presence', {})
    .c('show').t('chat').up()
    .c('status').t('Happily consuming your stanzas')
  )

  // Delete the old control node
  if(conf.meta.persistent){

    var message_delete_node = new ltx.Element('iq',{
      to: 'pubsub.'+conf.xmppDomain,
      from: globalJID,
      type: 'set'
    })
    message_delete_node.c('pubsub', { xmlns:'http://jabber.org/protocol/pubsub'})
     .c('delete', { node: conf.xmppUser+'_act'}).up()
    xmppClient.send(message_delete_node)
    logger.info("(Nools - init) Control node (old) - deletion");

    var message_new_node = new ltx.Element('iq',{
      to: 'pubsub.'+conf.xmppDomain,
      from: globalJID,
      type: 'set'
    })
    message_new_node.c('pubsub', { xmlns:'http://jabber.org/protocol/pubsub'})
     .c('create', { node: conf.xmppUser+'_act'}).up()
    xmppClient.send(message_new_node)
    logger.info("(Nools - init) Control node - creation");

    // Configure control node
    var message_config_node = new ltx.Element('iq',{
      to: 'pubsub.'+conf.xmppDomain,
      from: globalJID,
      type: 'set'
    })
    message_config_node.c('pubsub', { xmlns:'http://jabber.org/protocol/pubsub'})
     .c('configure', { node: conf.xmppUser+'_act'})
     .c('x', {xmlns:'jabber:x:data', type:'submit'})
     .c('field', {var:'FORM_TYPE', type:'hidden'})
     .c('value').t('http://jabber.org/protocol/pubsub#node_config').up().up()
     .c('field', {var:'pubsub#access_model', type:'list-single'})
     .c('value').t('whitelist').up().up()
     .c('field', {var:'pubsub#item_expire', type:'text-single'})
     .c('value').t('86400').up().up()
     .c('field', {var:'pubsub#purge_offline', type:'boolean' })
     .c('value').t('1')
    xmppClient.send(message_config_node)
    logger.info("(Nools - init) Control node - configuration");

    // Subscribe to control node
    var message_sub_actnode = new ltx.Element('iq',{
      to: 'pubsub.'+conf.xmppDomain,
      from: globalJID,
      type: 'set'
    })
    message_sub_actnode.c('pubsub', { xmlns:'http://jabber.org/protocol/pubsub'})
      .c('subscribe', { node: conf.xmppUser+'_act', jid: globalJID})
    xmppClient.send(message_sub_actnode)
    logger.info("(Nools - init) Control node: "+ conf.xmppUser+"_act - subscription");

    // Award control node privileges to: maya, drbe_test
    var message_affil = new ltx.Element('iq',{
      to: 'pubsub.'+conf.xmppDomain,
      from: globalJID,
      type: 'set'
    })
    message_affil.c('pubsub', { xmlns:'http://jabber.org/protocol/pubsub'})
      .c('affiliations', { node: conf.xmppUser+'_act'})
      .c('affiliation', {jid:'maya@sensor.andrew.cmu.edu', affiliation:'publisher'}).up()
      .c('affiliation', {jid:'drbe_test@sensor.andrew.cmu.edu', affiliation:'publisher'})
    xmppClient.send(message_affil)
    logger.info("(Nools - init) Control node - permissions");
  }
  // */

  // Publish meta message
  var message_meta = new ltx.Element('iq',{
    to: 'pubsub.'+conf.xmppDomain,
    from: globalJID,
    type: 'set'
  })
  message_meta.c('pubsub', { xmlns:'http://jabber.org/protocol/pubsub'})
    .c('publish', {node: conf.xmppUser+'_act'})
    .c('item', {id: 'meta'})
    .c('meta', {xmlns: 'http://jabber.org/protocol/mio', info: 'Distributed Rules-based Engine (DRBE) Instance.', type: 'Daemon', name:'DRBE', timestamp: moment().format()})
    .c('geoloc', {xmlns: 'http://jabber.org/protocol/geoloc', 'xml:lang':'en'})
    .c('area').t('Bosch Research Technology Center').up()
    .c('building').t('Bosch RTC Pittsburgh').up()
    .c('country').t('United States').up()
    .c('floor').t('3').up()
    .c('locality').t('Pittsburgh').up()
    .c('postalcode').t('15222').up()
    .c('region').t('Pennsylvania').up()
    .c('room').t('Corridor 301').up()
    .c('street').t('Smallman St.').up()
    .c('timestamp').t(moment().format()).up()
    .c('tzo').t('-5:00').up().up()
    .c('property', {type: sessionKey, name: 'Session Key'}).up()
    .c('property', {type: conf.meta.type, name: 'Instance Type'}).up()
    .c('property', {type: conf.meta.geoloc, name: 'Mounting Location'}).up()
    .c('property', {type: conf.appVersion, name: 'DRBE Daemon Version'}).up()
    .c('property', {type: conf.meta.persistent, name: 'Persistence Mode'}).up()
    .c('property', {value: 'Daemon', name: 'type'}).up()
  xmppClient.send(message_meta)

  // Publish the session key to the parent WME scope
  sessionParent.meta.assert({"type":"sessionKey", "value":sessionKey});

  // Publish the session key to control node
  send({name: "xmpp-pubsub", value: sessionKey, dataname:"Session Key", itemid:"_Session Key", loc: conf.xmppUser+"_act"}, sessionKey, false)
  // */

})

xmppClient.on('stanza', function(stanza){

  var payload;
/*/
  try {
    stanzaTimestamp = JSON.stringify(stanza.attrs);
    console.log(JSON.stringify(stanza));

  } catch(err) {
    stanzaTimestamp = null;
    console.log(err);
  }
// */

  if(stanza.is('message') /*&& (stanzaTimestamp) && moment(stanzaTimestamp).isAfter(initTime)*/ ){

    /*/ // echo: swap addresses before responding to server
    stanza.attrs.to = stanza.attrs.from;
    delete stanza.attrs.from

    logger.info('Sending response: '+ stanza.root().toString())
    xmppClient.send(stanza)

    // */

    // Process the input
    try{
    payload = getStanzaElements(stanza);
    var payloadType = payload.input.type;
    } catch(err){
      console.log(err);
    }

    //logger.log("## Processed input:");

    stanzaTimestamp = payload.timestamp || payload.input.timestamp || payload.input.attrs.timestamp;
    if(!payload.timestamp && !payload.input.timestamp && !payload.input.attrs.timestamp) {
      logger.info('##### Message Assertion TSCHECK #####', "PAYLOAD.TIMESTAMP: "+payload.timestamp, "PAYLOAD.INPUT.TIMESTAMP: "+payload.input.timestamp);
      logger.info("PAYLOAD: "+JSON.stringify(payload))
    }

    //logger.info(stanza.toString());

    //console.log('##### Message Assertion #####', payload);
    //console.log(stanza.toString());

    if( (payloadType == 'drbe_act') && (payload.input !== 'invalid') && (moment(stanzaTimestamp).isAfter(initTime)) ){
      //
      try{
        system(payload.input);
      } catch(err){
        console.log(err);
      }
      // */
    } else if((payload.type !== 'error') && (payload.input !== 'invalid') && (moment(stanzaTimestamp).isAfter(initTime)) ) {

      try{
        // insert a new, formatted, processed sensor message to nools
        var sessionChild = flow.getSession(new ruletype(payload));
        //console.log(payload);
        sessionChild.match().then(function(){
          console.log("DONE Matching Child");
          //sessionParent.assert(new ruletype(payload))
          console.log("### PARENT FACTS: "+JSON.stringify(sessionParent.meta.getFacts()));
        });

        //console.log(flow.__rules);

        sessionChild.dispose();

      } catch(err){
        console.log(err);
      }
    }
  }

})

xmppClient.on('error', function(e){
  logger.error(e)
})

/*/
process.on('exit', function () {
  //xmppClient.end()
  logger.info("This has been RuleEngine session, "+conf.sessionKey);
})
// */
//
