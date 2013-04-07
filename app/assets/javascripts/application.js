//= require jquery
//= require handlebars.runtime
//= require ember
//= require_tree .

var EMOJI_REGEXES = emojis.map(function(emoji) {
  // need to escape for regex
  emoji = emoji.replace("+", "\\+");
  return new RegExp(":(" + emoji + "):", "g");
});

Ember.Handlebars.registerBoundHelper("emojify", function(text) {
  var escape = Handlebars.Utils.escapeExpression;

  if (text) {
    text = escape(text);
  } else {
    return "";
  }

  EMOJI_REGEXES.forEach(function(regexp) {
    text = text.replace(regexp, '<img src="/assets/emoji/$1.png">');
  });

  return new Handlebars.SafeString(text);
});

var CATSOCKET_API_KEY = $("meta[name=catsocket-api-key]").attr("content");

var App = Ember.Application.create();

App.Router.map(function() {
  this.route("room", {path: "/rooms/:room_id"});
});

App.Room = Ember.Object.extend({
  id: null,

  messages: function() {
    var records = Ember.ArrayProxy.create({content: Ember.A(), isLoaded: false});

    // hack hack hack
    var params = {channel: this.get('id'), timestamp: 0, guid: "d8363d8e-2ccf-9e75-09d5-22c1912d2a6f", api_key: CATSOCKET_API_KEY};
    $.getJSON("http://catsocket.com:5000", params).then(function(json) {
      var messages = json.data.map(function(m) {
        var messageData = {};
        try {
          messageData = JSON.parse(m);
        } catch(e) {}

        if (messageData) {
          return App.Message.create(messageData);
        }
      }).filter(function(m) {
        return !!m;
      });
      records.set('content', messages);
      records.set('isLoaded', true);
    });
    return records;
  }.property()
});

App.Room.find = function(id) {
  return App.Room.create({id: id});
};

App.Message = Ember.Object.extend({
  from: null,
  text: null,
  type: 'm', // m for message, j for join, p for part
  timestamp: function() {
    return +new Date();
  }.property().volatile(),

  toJSON: function() {
    return this.getProperties('from', 'text', 'timestamp');
  }
});

App.IndexRoute = Ember.Route.extend({
  redirect: function() {
    this.transitionTo('room', App.Room.find("chat"));
  }
});

App.RoomRoute = Ember.Route.extend({
  model: function(params) {
    return App.Room.find(params.room_id);
  }
});

function getNickname() {
  var nickname = localStorage.getItem('nickname');
  if (!nickname) {
    nickname = prompt("Enter a nickname:");
    localStorage.setItem('nickname', nickname);
  }
  return nickname;
}

App.RoomController = Ember.ObjectController.extend({
  nickname: getNickname(),
  messageText: null,
  _timer: null,

  users: function() {
    return [];
  }.property(),

  contentWillChange: function() {
    var roomId = this.get('id');
    if (roomId) {
      this._publish(App.Message.create({type: 'p', from: this.get('nickname')}));
      CS.unsubscribe(this.get('id'));
    }
    if (this._timer) { clearInterval(this._timer); }
  }.observesBefore('content'),

  contentDidChange: function() {
    CS.subscribe(this.get('id'), this._update.bind(this));

    this._timer = setInterval(function() {
      this._publish(App.Message.create({type: 'j', from: this.get('nickname')}));
    }.bind(this), 10000);
  }.observes('content'),

  _publish: function(message) {
    CS.publish(this.get('id'), JSON.stringify(message.toJSON()), true);
  },

  _update: function(msgData) {
    var messages = this.get('messages'),
        users = this.get('users'),
        data;

    try {
      data = JSON.parse(msgData);
    } catch(e) {}

    if (!data) { return; }

    if (data.type === 'p') {
      users.removeObject(data.from);
    } else {
      if (!data.type || data.type === 'm') {
        messages.pushObject(App.Message.create({text: data.text, from: data.from, type: data.type}));
      }
      if (!users.contains(data.from)) {
        users.pushObject(data.from);
      }
    }
  },

  sendMessage: function() {
    var roomName = this.get('id'),
        messageText = this.get('messageText'),
        nickname = this.get('nickname');

    if (!messageText) { return; }

    var message = App.Message.create({from: nickname, text: messageText});
    CS.publish(roomName, JSON.stringify(message.toJSON()), true);
    this.set('messageText', null);
  }
});

App.RoomView = Ember.View.extend({
  templateName: "room",

  didInsertElement: function() {
    this.$('.new-message')[0].focus();
    this._scrollToBottom();
  },

  _scrollToBottom: function() {
    $('.room')[0].scrollTop = 99999;
  },

  messagesDidChange: function() {
    if (this.state === 'inDOM') {
      Ember.run.scheduleOnce('afterRender', this, this._scrollToBottom);
    }
  }.observes('controller.messages.[]')
});
