//current selected Conversation id
let conversationId;
let selectedConversation;
let loadedConversations = [];
let userImageUrl =
  "https://camo.githubusercontent.com/eb6a385e0a1f0f787d72c0b0e0275bc4516a261b96a749f1cd1aa4cb8736daba/68747470733a2f2f612e736c61636b2d656467652e636f6d2f64663130642f696d672f617661746172732f6176615f303032322d3531322e706e67";
let botAvatarUrl =
  "https://www.svgrepo.com/show/382106/male-avatar-boy-face-man-user-9.svg";
// this will be used to make new conversation window template
let defaultConversation = {
  id: 1,
  messages: [
    {
      role: "assistant",
      content:
        "Hello! I'm Passionate Pal, a virtual romantic counselor. I'm here to offer advice, support, and guidance to those seeking help with matters of the heart. Whether you're single, in a relationship, or somewhere in between, I'm here to listen and help you navigate the complexities of romance and love. So, how can I assist you today?",
      createDateTime: "",
    },
  ],
};
let isWaitingForChatRequest = false;
let canPlayAudio;
let audio;
const today = new Date();
let hasAddNewConversationButtonBeenPressed = false;
var qs = getQueryStrings();
let gender = qs["gender"];
console.log(gender);
var chatMessages = document.querySelector(".chat-messages");
let personalityType = "compassionate";

let maxConversations = 30;
//let outerDiv = document.getElementsByClassName("col-12 col-lg-5 col-xl-3 border-right")[0];
let outerDiv = document.getElementById("messages-wrapper");
let overflowId = false;
// track if can send message
let sendButtonActive = true;

const addSelectClass = function () {
  removeSelectClass();
  this.classList.add("selected");
};

const removeSelectClass = function () {
  for (var i = 0; i < button.length; i++) {
    button[i].classList.remove("selected");
  }
};

// event listeners
document
  .getElementById("send-button")
  .addEventListener("click", askQuestion, false);
document
  .getElementById("button-new-conversation")
  .addEventListener("click", createNewConversation, false);

var button = document.getElementsByClassName("personality");
for (var i = 0; i < button.length; i++) {
  button[i].addEventListener("click", addSelectClass);
}

//initialize
createDefaultMessage();
processLoadingConversations();

// This is called to initialize to load the saved conversations to the side bar
function createConversationElement(conversation) {
  let aRef = document.createElement("a");

  console.log(conversation);
  //const lastSeenAt = new Date(conversation.messages.createDateTime[0], conversation.messages.createDateTime[1], conversation.messages.createDateTime[2], conversation.messages.createDateTime[3], conversation.messages.createDateTime[4], conversation.messages.createDateTime[5] );
  let firstUserMessageArray = conversation.messages[1].content.split(" ");
  let parsedFirstUserMessagePreview = "";

  for (let i = 0; i < firstUserMessageArray.length; i++) {
    if (i > 4) break;
    parsedFirstUserMessagePreview += firstUserMessageArray[i] + " ";
  }

  //let outerDiv = document.getElementsByClassName("col-12 col-lg-5 col-xl-3 border-right")[0];
  outerDiv.appendChild(aRef);

  aRef.outerHTML =
    '<a href="#" onclick=clickHandler(' +
    conversation.id +
    ') class="list-group-item list-group-item-action border-0">' +
    '<div class="d-flex align-items-start">' +
    "<img src=" +
    botAvatarUrl +
    ' class="rounded-circle mr-1" alt="PassionatePal" width="40" height="40">' +
    '<div class="flex-grow-1 ml-3">' +
    "Conversation " +
    conversation.id +
    '<div class="small"><span class="fas fa-circle chat-online"></span>' +
    parsedFirstUserMessagePreview +
    "</div></div></div></a>";
  /*
    aRef.outerHTML = '<a href="#" onclick=clickHandler('+conversation.id+') class="list-group-item list-group-item-action border-0" style="color:white; background-color: hsl(308, 46%, 54%);">' 
                          +  '<div class="d-flex align-items-start">'
                           +     '<img src="' + robotImageUrl + '" class="rounded-circle mr-1" alt="Passioante Pal" width="40" height="40">'
                           +     '<div class="flex-grow-1 ml-3">'
                           +         'Conversation '  + conversation.id 
                           +         '<div class="small"><span class="fas fa-circle chat-online"></span>' + parsedFirstUserMessagePreview + '</div></div></div></a>'*/
}

// call to process flow related to calling the generate-answer API and setting the respective data with the result of the async request
// code is very brittle around this part

function askQuestion() {
  // Get prompt value
  var textContent = document.getElementById("send-button-text").value;
  // if waiting for request or if prompt is empty
  if (!sendButtonActive || !textContent) return;

  sendButtonActive = false;

  // Make an AJAX call to the backend REST API to generate the story
  let url =
    "http://localhost:8080/passionatepal/api/conversation/generate-answer";

  let requestDto = new GenerateAnswerDto();
  if (conversationId || conversationId != undefined) {
    requestDto.id = conversationId;
    if (overflowId) requestDto.id.conversationId = null;
  }
  requestDto.content = textContent;
  requestDto.personalityType = personalityType;
  document.getElementById("send-button-text").value = "";
  let messageObject = {
    content: textContent,
    role: "user",
  };

  createMessage(true, messageObject, null, true, null);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  var xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);
  xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
  console.log(JSON.stringify(requestDto));
  isWaitingForChatRequest = true;
  xhr.send(JSON.stringify(requestDto));

  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
      var response = JSON.parse(xhr.responseText);

      overflowId = false;
      // Parse the JSON response from the backend REST API
      console.log("ask Question xhr.responseText: %s", xhr.responseText);

      conversationId = response.id;
      console.log("Response content : " + response.content);
      let messageObject = {
        content: response.content,
        role: response.role,
        id: response.id,
        audio: response.audio,
      };


      createMessage(false, messageObject, null, true);
      clearConversations();
      processLoadingConversations();
      //  chatMessages.appendChild(newChatDiv);
      //  textToSpeech(response.content);
    }
    // send button will be deactivated until we have response from the server
    sendButtonActive = true;
    isWaitingForChatRequest = false;
  };
}

// call back function click handler
function loadClickConversation(id) {
  if (audio && !audio.paused) {
    audio.pause();
  }
  if (conversationId === id) return;
  if (isWaitingForChatRequest) return;
  // clear messages
  conversationId = id;
  let conversation = loadedConversations.filter((v) => v.id === id)[0];
  selectedConversation = conversation;

  // retrieve messages container
  let chatMessages = document.getElementsByClassName("chat-messages p-4")[0];
  chatMessages.innerHTML = "";

  for (let i = 0; i < conversation.messages.length; i++) {
    if (i === 0) continue;
    let message = conversation.messages[i];
    if (message.role === "system") continue;
    let isUser = message.role === "user" ? true : false;
    console.log("Message : " + JSON.stringify(message));
    // divToAdd.outerHTML =
    createMessage(isUser, message, message.createDateTime, false, null);
  }
  createDefaultMessage();
}

// converts now-time hour to display format
function getNowParsedDate() {
  const event = today;
  let messageTime = event.toLocaleTimeString("en-US");
  let splitMessageTimeString = messageTime.split(":");
  let parsedMessageTime =
    splitMessageTimeString[0] +
    ":" +
    splitMessageTimeString[1] +
    " " +
    messageTime.split(" ")[1].toLowerCase();

  return parsedMessageTime;
}

// converts passed date in array format to display format
function getParsedDate(date) {
  const event = new Date(date[0], date[1], date[2], date[3], date[4]);
  let messageTime = event.toLocaleTimeString("en-US");
  let splitMessageTimeString = messageTime.split(":");
  let parsedMessageTime =
    splitMessageTimeString[0] +
    ":" +
    splitMessageTimeString[1] +
    " " +
    messageTime.split(" ")[1].toLowerCase();

  return parsedMessageTime;
}

// Listener click callback
function clickHandler(id) {
  console.log("condition");
  console.log(chatMessages.firstElementChild);
  // chatMessages.removeChild(chatMessages.firstElementChild);
  loadClickConversation(id);
}

function textToSpeech(text) {
  //Working with male voice
  let synth = window.speechSynthesis;
  let utterThis = new SpeechSynthesisUtterance(text);
  synth.speak(utterThis);
}

// this is called when clicking the Add new conversation button
function createNewConversation() {
  // Don't allow to spam the add new conversation button
  overflowId = true;

  // only 1 new conversation tab
  if (hasNewConversationOpened) return;
  hasNewConversationOpened = true;
  let chatMessages = document.getElementsByClassName("chat-messages p-4")[0];
  chatMessages.innerHTML = "";

  let message = defaultConversation.messages[0];

  let now = today;
  let dateArray = [
    now.getFullYear(),
    now.getMonth(),
    now.getDay(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  ];
  defaultConversation.messages[0].createDateTime = dateArray;
  createMessage(false, message, dateArray, true);
  defaultConversation.id =
    loadedConversations[loadedConversations.length - 1].id + 1;
  loadedConversations.push(defaultConversation);
  conversationId = null;

  let aRef = document.createElement("a");

  let outerDiv = document.getElementById("messages-wrapper");
  outerDiv.prepend(aRef);

  aRef.outerHTML =
    '<a href="#" onclick=clickHandler(' +
    defaultConversation.id +
    ') class="list-group-item list-group-item-action border-0">' +
    '<div class="d-flex align-items-start">' +
    "<img src=" +
    botAvatarUrl +
    ' class="rounded-circle mr-1" alt="PassionatePal" width="40" height="40">' +
    '<div class="flex-grow-1 ml-3">' +
    "Conversation " +
    defaultConversation.id +
    '<div id="top_preview_conversation" class="small"><span class="fas fa-circle chat-online"></span>' +
    "Initiate Conversation" +
    "</div></div></div></a>";
}

// calls to get all conversations API and sets side bar to conversations
function processLoadingConversations() {
  overflowId = false;
  var xhr = new XMLHttpRequest();
  xhr.open(
    "GET",
    "http://localhost:8080/passionatepal/api/conversation/get-all-conversations",
    true
  );
  xhr.send();

  selectedConversation = document.getElementsByClassName(
    ".d-flex .align-items-start"
  );

  xhr.onreadystatechange = function () {
    if (xhr.readyState === XMLHttpRequest.DONE && xhr.status === 200) {
      hasNewConversationOpened = false;
      console.log("xhr.responseText: %s", xhr.responseText);
      var conversations = JSON.parse(xhr.responseText);
      loadedConversations = conversations;

      if (conversations.length > 0) {
        outerDiv.innerHTML = "";
      }

      for (
        let i = conversations.length - 1;
        i >= conversations.length - maxConversations;
        i--
      ) {
        createConversationElement(conversations[i]);
      }

      if (conversations.length > 0) {
        selectedConversation = conversations.length - 1;
        // loadClickConversation(conversations.length);
      } else {
        createConversationElement(defaultConversation);
      }
    }
  };
}

// clears conversations
function clearConversations() {
  let wrapperElement = document.getElementById("messages-wrapper");
  wrapperElement.innerHTML = "";
}

var lastAudio = null;
function playMusic(id) {
  var audio = document.getElementById(id);
  if (lastAudio && lastAudio !== audio) {
    lastAudio.pause();
    lastAudio.currentTime = 0;
  }
  audio.play();
  lastAudio = audio;
}

function changePersonalityTypeState(personalityTypeGiven) {
  personalityType = personalityTypeGiven;
  console.log("Changed personality type to: " + personalityType);
}
function GenerateAnswerDto(personalityType, content, id) {
  this.personalityType = personalityType;
  this.content = content;
  this.id = id;
}

function createDefaultMessage() {
  var newDefaultMessageDiv = document.createElement("div");
  newDefaultMessageDiv.classList.add("chat-message-left");
  newDefaultMessageDiv.classList.add("pb-4");

  newDefaultMessageDiv.innerHTML =
    "<div><img src=" +
    botAvatarUrl +
    ' class="rounded-circle mr-1" width="60" height="60">' +
    '<div class="text-muted small text-nowrap mt-2">' +
    "</div></div>" +
    '<div class="flex-shrink-1 py-2 px-3 ml-3 mask-custom text-left">' +
    '<div class="flex-shrink-1 rounded py-2 px-3 ml-3><div class="font-weight-bold mb-1 "><b>' +
    "Passionate Pal" +
    "</b></div>" +
    '<div class="flex-grow-0 py-3 px-4 border-top">' +
    "Hello! I'm Passionate Pal, a virtual romantic counselor. I'm here to offer advice, support, and guidance to those seeking help with matters of the heart. Whether you're single, in a relationship, or somewhere in between, I'm here to listen and help you navigate the complexities of romance and love. So, how can I assist you today?" +
    "</div></div></div>";

  chatMessages.prepend(newDefaultMessageDiv);
}

// this creates the html related to a message
function createMessage(isUser, message, date, isNowDate) {
  let userName = isUser ? "You" : "PassionatePal";

  let chatMessageDivElement = isUser ? "text-right" : "text-left";
  let imageUrl = isUser ? userImageUrl : botAvatarUrl;
  let maskType = isUser ? "mask-custom-user" : "mask-custom";
  let name = isUser ? "You" : "Passionate Pal";
  let parsedDate = isNowDate ? getNowParsedDate() : getParsedDate(date);
  console.log(message.audio);
  let avatarAudio = isUser ? "" : ' class="avatar-audio-wrapper"';
  let inputDiv = !message.audio
    ? ""
    : '<input width="60" height="60" type="image" src="Resources/play.png" class="rounded-circle mr-1 audio" onclick=requestAndPlayAudio("' +
      message.audio +
      '") />';
  var newUserChatDiv = document.createElement("div");
  isUser
    ? newUserChatDiv.classList.add("chat-message-right")
    : newUserChatDiv.classList.add("chat-message-left");
  newUserChatDiv.classList.add("pb-4");
  newUserChatDiv.innerHTML =
    "<div" +
    avatarAudio +
    "><img src=" +
    imageUrl +
    ' class="rounded-circle mr-1" width="60" height="60">' +
    '<div class="text-muted small text-nowrap mt-2">' +
    parsedDate +
    "</div>" +
    inputDiv +
    "</div>" +
    '<div class="flex-shrink-1 py-2 px-3 ml-3 ' +
    maskType +
    " " +
    chatMessageDivElement +
    '"><div class="flex-shrink-1 rounded py-2 px-3 ml-3><div class="font-weight-bold mb-1 "><b>' +
    name +
    "</b></div>" +
    '<div class="flex-grow-0 py-3 px-4 border-top">' +
    message.content +
    "</div></div></div>";
  chatMessages.appendChild(newUserChatDiv);
  console.log(chatMessageDivElement);
}

function getQueryStrings() {
  var assoc = {};
  var decode = function (s) {
    return decodeURIComponent(s.replace(/\+/g, " "));
  };
  var queryString = location.search.substring(1);
  var keyValues = queryString.split("&");

  for (var i in keyValues) {
    var key = keyValues[i].split("=");
    if (key.length > 1) {
      assoc[decode(key[0])] = decode(key[1]);
    }
  }

  return assoc;
}

function getNowParsedDate() {
  let date = new Date();
  let messageTime = date.toLocaleTimeString("en-US");
  let splitMessageTimeString = messageTime.split(":");
  let parsedMessageTime =
    splitMessageTimeString[0] +
    ":" +
    splitMessageTimeString[1] +
    " " +
    messageTime.split(" ")[1].toLowerCase();

  return parsedMessageTime;
}

function requestAndPlayAudio(fileName) {
  if (audio && audio.pause) {
    audio.pause();
  }
  if (audio == null) {
    audio = new Audio();
  }
  audio.src = "http://localhost:8080/passionatepal/api/sound/" + fileName;
  console.log(fileName);
  audio.play();
}
