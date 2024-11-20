import * as AWS from "aws-sdk";
import { Buffer } from "buffer";
import * as ssml from "ssml/index";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

var Polly;
let animNames = ["wave_hand", "nodding"];
let visemeArray = [];
let ssmlArray = [];

export class Action {
  tick = 0;
  action = null;
  expression = null;
  focus = null;
  constructor(tick, action = null, expression = null, focus = null) {
    this.tick = tick;
    this.action = action;
    this.expression = expression;
    this.focus = focus;
  }
}

export class PollyM {
  ssmlArray = [];
  constructor() {
    // Initialize Polly with environment variables
    let pollyCredentials = {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      signatureVersion: "v4",
      region: process.env.AWS_REGION || "us-east-1", // Default to us-east-1
    };
    Polly = new AWS.Polly(pollyCredentials);
  }
  getLipSyncs(pollyViseme) {
    switch (pollyViseme) {
      case "o":
      case "O":
      case "oo":
      case "OO":
      case "u":
        return "ou";

      case "a":
      case "A":
      case "aa":
      case "AA":
        return "aa";

      case "c":
      case "C":
      case "cc":
      case "CC":
      case "ch":
      case "CH":
        return "CH";

      case "d":
      case "D":
      case "dd":
      case "DD":
        return "DD";

      case "e":
      case "E":
      case "ee":
      case "EE":
        return "E";

      case "f":
      case "F":
      case "ff":
      case "FF":
        return "FF";

      case "p":
      case "P":
      case "pp":
      case "PP":
        return "PP";

      case "r":
      case "R":
      case "rr":
      case "RR":
        return "RR";

      case "s":
      case "S":
      case "ss":
      case "SS":
        return "SS";

      case "t":
      case "T":
      case "tt":
      case "TT":
      case "th":
      case "TH":
        return "TH";

      case "i":
      case "I":
      case "ii":
      case "II":
      case "ih":
      case "IH":
        return "ih";

      case "k":
      case "K":
      case "kk":
      case "KK":
        return "kk";

      case "n":
      case "N":
      case "nn":
      case "NN":
        return "nn";

      case "sil":
      case "SIL":
        return "sil";

      default:
        return "aa";
    }
  }

  getAudioFromText(pollyCallback, textToRead) {
    let paramsAudio = {
      Text: textToRead,
      Engine: "neural",
      OutputFormat: "mp3",
      VoiceId: "Joanna",
      TextType: "ssml",
    };

    Polly.synthesizeSpeech(paramsAudio)
      .promise()
      .then((audio) => {
        try {
          var uInt8Array = audio.AudioStream;
          var arrayBuffer = uInt8Array.buffer;
          var blob = new Blob([arrayBuffer]);
          var url = URL.createObjectURL(blob);
          pollyCallback("Success", 2, url);
        } catch (e) {
          pollyCallback("Failed", 2, null);
        }
      });
  }

  getVisemesFromText(pollyCallback, textToRead) {
    let paramsAudio = {
      Text: textToRead,
      Engine: "neural",
      OutputFormat: "json",
      VoiceId: "Joanna",
      TextType: "ssml",
      SpeechMarkTypes: ["word", "viseme", "ssml"],
    };

    Polly.synthesizeSpeech(paramsAudio)
      .promise()
      .then((audio) => {
        let data = [];
        const buf = Buffer.from(audio.AudioStream);
        const content = buf.toString();
        const lines = content.split("\n");
        if (!lines[lines.length - 1]) {
          lines.pop();
        }
        try {
          let visemeResult = lines;
          //console.log("Polly: ", lines);
          let len = visemeResult.length;
          let count = 0;

          for (let i = 0; i < len; i++) {
            let line = visemeResult[i];
            var obj = JSON.parse(line);
            //console.log("Viseme Obj ", obj);
            var tempNext;
            var tempPrev;
            if (i > 0) {
              tempPrev = visemeResult[i - 1];
            }

            if (i + 1 < len) {
              tempNext = visemeResult[i + 1];
            }
            if (obj.type == "viseme") {
              let viseme = "";
              viseme = this.getLipSyncs(obj.value);
              let visemeObj = new Action(obj.time, viseme);
             /*  if (
                count % 2 == 0 ||
                tempNext.type == "word" ||
                tempPrev.type == "word" ||
                viseme == "sil"
              ) {
               
              }
              count++; */
              visemeArray.push(visemeObj);
             // console.log("Polly Obj ",visemeArray);
            } else if (obj.type == "ssml") {
              let action = obj.value;
              let ssmlObj = new Action(obj.time, action);
              ssmlArray.push(ssmlObj);
            }
          }
          data.push(visemeArray);
          data.push(ssmlArray);
        //  console.log("Polly data ",visemeArray[0].tick);
          pollyCallback("Success", 1, data);
        } catch (e) {
          pollyCallback("Failed", 1, null);
        }
      });
  }
}
