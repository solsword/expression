/*
 * # `expression.js`
 *
 * Simple function-based Processing-like library for creating web pages that
 * include text, sound, and/or images. Each function is a command that creates
 * some text, part of a drawing, or a sound. Drawn elements, text, and sounds
 * are each added to the most recent drawing/text/audio context: a canvas,
 * document, or track. A set of commands for managing multiple
 * canvases/documents/tracks can be used to create more complicated pages.
 *
 * Focuses on simple interface and useful metaphors for beginning programmers
 * rather than on full features.
 */

/*-------------------------------- Globals -----------------------------------*/

// Namespace URLs for SVG, XMLNS and XLINK namespaces
var SVGNS = "http://www.w3.org/2000/svg";
var XMLNS = "http://www.w3.org/2000/xmlns/";
var XLINKNS = "http://www.w3.org/1999/xlink";

// where to put stuff
var CONTAINER = document.body;

// drawing
var CURRENT_CANVAS = undefined; // Holds the current active canvas
var CURRENT_PATH = undefined; // The current drawing path
var DRAWING_STYLE = {}; // Current drawing style specifications
var DEFAULT_DRAWING_STYLE = { // Default drawing style
  "stroke-width": "2",
  "stroke": "black",
  //"fill": "#ffc",
  "fill": "#def",
  //"fill": "#bef",
};

// text
var CURRENT_DOCUMENT = undefined; // Holds the current active document
var CURRENT_HEADING = undefined; // The current heading for `write_title`
var CURRENT_PARAGRAPH = undefined; // The current paragraph for `write`
var TEXT_STYLE = {}; // The current text style
var FONT_SPECS = { // font fallback orderings by serif/sans and language
  "serif": {
    "default": (
      '"Noto Serif SC", ' // simplified Chinese as default for CJK
    + '"Noto Serif", ' // fallback for Latin+ stuff not included in SC font
    + '"Noto Serif TC", ' // fallback for extra traditional Chinese characters?
    + '"Noto Serif KR", ' // fallback for Korean
    + '"Noto Serif JP", ' // fallback for Japanese
    + 'serif' // safe system default fallback
    ),
    "SC": ( // Simplified Chinese (TODO: Keys in native languages)
      '"Noto Serif SC", '
    + '"Noto Serif KR", '
    + '"Noto Serif", '
    + 'serif'
    ),
    "TC": ( // Traditional Chinese
      '"Noto Serif TC", '
    + '"Noto Serif KR", '
    + '"Noto Serif", '
    + 'serif'
    ),
    "KR": ( // Korean
      '"Noto Serif KR", '
    + '"Noto Serif TC", '
    + '"Noto Serif", '
    + 'serif'
    ),
    "JP": ( // Japanese
      '"Noto Serif JP", '
    + '"Noto Serif KR", '
    + '"Noto Serif", '
    + 'serif'
    ),
    "HK": ( // Cantonese (Hong Kong)
      '"Noto Sans HK", ' // there's no serif HK T_T
    + '"Noto Serif TC", '
    + '"Noto Serif KR", '
    + '"Noto Serif", '
    + 'serif'
    ),
  },
  "sans-serif": {
    "default": (
      '"Noto Sans SC", ' // simplified Chinese as default for CJK
    + '"Noto Sans", ' // fallback for Latin+ stuff not included in SC font
    + '"Noto Sans TC", ' // fallback for extra traditional Chinese characters?
    + '"Noto Sans KR", ' // fallback for Korean
    + '"Noto Sans JP", ' // fallback for Japanese
    + 'sans-serif' // safe system default fallback
    ),
    "SC": ( // Simplified Chinese (TODO: Keys in native languages)
      '"Noto Sans SC", '
    + '"Noto Sans KR", '
    + '"Noto Sans", '
    + 'sans-serif'
    ),
    "TC": ( // Traditional Chinese
      '"Noto Sans TC", '
    + '"Noto Sans KR", '
    + '"Noto Sans", '
    + 'sans-serif'
    ),
    "KR": ( // Korean
      '"Noto Sans KR", '
    + '"Noto Sans TC", '
    + '"Noto Sans", '
    + 'sans-serif'
    ),
    "JP": ( // Japanese
      '"Noto Sans JP", '
    + '"Noto Sans KR", '
    + '"Noto Sans", '
    + 'sans-serif'
    ),
    "HK": ( // Cantonese (Hong Kong)
      '"Noto Sans HK", '
    + '"Noto Sans TC", '
    + '"Noto Sans KR", '
    + '"Noto Sans", '
    + 'sans-serif'
    ),
  },
  "monospace": {
    "default": (
      '"Noto Monospace SC", ' // simplified Chinese as default for CJK
    + '"Noto Sans", ' // fallback for Latin+ stuff not included in SC font
    + '"Noto Sans TC", ' // fallback for extra traditional Chinese characters?
    + '"Noto Sans KR", ' // fallback for Korean
    + '"Noto Sans JP", ' // fallback for Japanese
    + 'sans-serif' // safe system default fallback
    ),
    "SC": ( // Simplified Chinese (TODO: Keys in native languages)
      '"Noto Sans SC", '
    + '"Noto Sans KR", '
    + '"Noto Sans", '
    + 'sans-serif'
    ),
    "TC": ( // Traditional Chinese
      '"Noto Sans TC", '
    + '"Noto Sans KR", '
    + '"Noto Sans", '
    + 'sans-serif'
    ),
    "KR": ( // Korean
      '"Noto Sans KR", '
    + '"Noto Sans TC", '
    + '"Noto Sans", '
    + 'sans-serif'
    ),
    "JP": ( // Japanese
      '"Noto Sans JP", '
    + '"Noto Sans KR", '
    + '"Noto Sans", '
    + 'sans-serif'
    ),
    "HK": ( // Cantonese (Hong Kong)
      '"Noto Sans HK", '
    + '"Noto Sans TC", '
    + '"Noto Sans KR", '
    + '"Noto Sans", '
    + 'sans-serif'
    ),
  }
}

var DEFAULT_TEXT_STYLE = { // Default text style
  "font-weight": "normal",
  "text-decoration": "none",
  "font-family": FONT_SPECS["serif"]["default"],
  "font-style": "normal",
  "font-size": "14pt",
};

// audio
var CURRENT_AUDIO = undefined; // The current audio element
var CURRENT_TRACK = undefined; // The current audio track
const PLAY_SYMBOL = "▶️";
const RESET_SYMBOL = "⏮";
const PAUSE_SYMBOL = "⏸";
const SPEAKER_SYMBOL = "🔈";
const MUTE_SYMBOL = "🔇";
var SCHEDULING_INTERVAL = 50; // milliseconds
var SCHEDULING_LOOKAHEAD = 80; // milliseconds
var SEMITONE_FREQUENCIES = [ // 12 tones per octave
  440, // A4
  466.16, // A#4
  493.88, // B4
  523.25, // C5
  554.37, // C#5
  587.33, // D5
  622.25, // D#5
  659.25, // E5
  698.46, // F5
  739.99, // F#5
  783.99, // G5
  830.61, // G#5
];
var BASE_LETTERS = "ABCDEFG";
var TONE_LETTERS = [ // letter names for each tone
  "A",
  "A#",
  "B",
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
];
var PENTATONIC_LETTERS = [ "A", "C", "D", "E", "G" ]; // pentatonic scale tones
var OCTAVES = [ '--', '-', '', '+', '++' ]; // suffixes to denote octave shifts
var ATTACK_TIME = 0.2; // attack time in % of note duration
var SUSTAIN_TIME = 0.3; // sustain time in % of note duration
// TODO: Variable tempo!!!
var BPM = 108; // beats per minute
var FULL_NOTE_LENGTH = (1/(BPM / 60)) * 4; // length of a full note per BPM

/*--------------------- Context Management Functions -------------------------*/

function set_container(element) {
  /*
   * ## `set_container`
   *
   * - Categories: internal
   * - Parameters:
   *    * element: A DOM element.
   * - Returns: nothing
   * - Behavior: Sets the given DOM element as the destination for any new
   *     contexts (audo, text, or drawing) created by other expression.js
   *     functions.
   * - See Also: new_canvas, new_document, new_audio
   */
  CONTAINER = element;
}

function reset() {
  /*
   * ## `reset`
   *
   * - Categories:
   * - Parameters: None
   * - Retursn: nothing
   * - Behavior: deletes everything created by expression.js and removes all
   *     created nodes from the page.
   */
  CONTAINER.innerHTML = "";

  CURRENT_CANVAS = undefined; // Holds the current active canvas
  CURRENT_PATH = undefined; // The current drawing path
  DRAWING_STYLE = {}; // Current drawing style specifications

  CURRENT_DOCUMENT = undefined; // Holds the current active document
  CURRENT_HEADING = undefined; // The current heading for `write_title`
  CURRENT_PARAGRAPH = undefined; // The current paragraph for `write`
  TEXT_STYLE = {}; // The current text style

  CURRENT_AUDIO = undefined; // The current audio element
  CURRENT_TRACK = undefined; // The current audio track
}

function get_canvas() {
  /*
   * ## `get_canvas`
   *
   * - Categories: internal images
   * - Parameters: None
   * - Returns: A drawing canvas
   * - Behavior: Returns the current canvas to draw on. Not normally required,
   *     as functions that need a canvas will call this automatically. If there
   *     is no current canvas, a new canvas will be created and added to the
   *     page.
   * - See Also: new_canvas
   */
  if (CURRENT_CANVAS == undefined) {
    return new_canvas();
  } else {
    return CURRENT_CANVAS;
  }
}

function new_canvas() {
  /*
   * ## `new_canvas`
   * - Categories: context_control images
   * - Parameters: None
   * - Returns: A drawing canvas
   * - Behavior: Creates a new fresh drawing canvas and adds it to the page.
   *     Any drawing commands that follow this command will affect the new
   *     canvas instead of any previous canvases that might have been created
   *     before.
   * - See Also: get_canvas, current_drawing_style, the draw_... functions
   */
  let div = document.createElement("div");
  div.classList.add("canvas_container");

  let svg = document.createElementNS(SVGNS, 'svg');
  svg.classList.add("canvas");
  svg.setAttributeNS(XMLNS, "xmlns", SVGNS);
  svg.setAttributeNS(XMLNS, "xmlns:xlink", XLINKNS);
  svg.setAttributeNS(null, "viewBox", "-320 -240 640 480");

  // Canvas is a group within the SVG that applies a global transform to invert
  // y-coordinate.
  CURRENT_CANVAS = document.createElementNS(SVGNS, 'g');
  CURRENT_CANVAS.setAttributeNS(null, "transform", "scale(1, -1)");
  svg.appendChild(CURRENT_CANVAS);

  // A download button to save the SVG canvas to disk.
  dl_button = document.createElement("button");
  dl_button.classList.add("dl_button")
  //dl_button.innerText = "💾";
  dl_button.innerText = "⬇";
  dl_button.addEventListener("click", function () {
    save_canvas(svg);
  });

  div.appendChild(dl_button);
  
  div.appendChild(svg);
  CONTAINER.append(div);
  return CURRENT_CANVAS;
}

function save_canvas(svg, filename) {
  /*
   * ## `save_canvas`
   *
   * - Categories: internal images
   * - Parameters:
   *     * svg: The DOM SVG element to save.
   *     * filename (optional): The file name for the download.
   * - Returns: nothing
   * - Behavior: Bundles up the given SVG element into a file and offers it to
   *     the user as a download.
   * - See Also: new_canvas
   */
  if (filename == undefined) {
    filename = "expression_canvas.svg";
  }

  var a = document.createElement('a');
  a.setAttribute(
    "href",
    "data:image/svg;charset=utf-8," + encodeURIComponent(svg.outerHTML)
  );
  a.setAttribute("download", filename);
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function get_path() {
  /*
   * ## `get_path`
   * - Categories: internal images
   * - Parameters: None
   * - Returns: A drawing path
   * - Behavior: Returns the current drawing path, or creates and returns a new
   *     path within the current canvas if there isn't already a path. Not
   *     normally required, as functions that need an audio track will call
   *     this automatically.
   * - See Also: new_path
   */
  if (CURRENT_PATH == undefined) {
    return new_path();
  } else {
    return CURRENT_PATH;
  }
}

function new_path() {
  /*
   * ## `new_path`
   * - Categories: context_control images
   * - Parameters: None
   * - Returns: A new drawing path
   * - Behavior: Creates a new drawing path within the current canvas, and sets
   *     it as the current path. `draw_to` and similar calls that come after
   *     this will affect the new path instead of any previous paths. The pen
   *     position for the new path is [0, 0].
   * - See Also: get_path, move_pen_to, draw_line_to, draw_curve_to
   */
  CURRENT_PATH = document.createElementNS(SVGNS, 'path');
  CURRENT_PATH.setAttributeNS(null, "d", "M 0 0");
  CURRENT_PATH.setAttributeNS(null, "data-heading", "0");
  CURRENT_PATH.setAttributeNS(null, "data-position", "0,0");
  apply_drawing_style(CURRENT_PATH);
  let cv = get_canvas();
  cv.appendChild(CURRENT_PATH);
  return CURRENT_PATH;
}

function new_path_here() {
  /*
   * ## `new_path_here`
   * - Categories: context_control images
   * - Parameters: None
   * - Returns: A new drawing path
   * - Behavior: Works just like new_path, but sets the starting position of
   *     the new path to the current path position of the old path that's being
   *     replaced.
   * - See Also: new_path
   */
  let pos = get_pen_position();
  let heading = get_pen_heading();
  CURRENT_PATH = document.createElementNS(SVGNS, 'path');
  CURRENT_PATH.setAttributeNS(null, "d", "M " + pos[0] + " " + pos[1]);
  CURRENT_PATH.setAttributeNS(null, "data-heading", deg2rad(heading));
  CURRENT_PATH.setAttributeNS(null, "data-position", pos[0] + ',' + pos[1]);
  apply_drawing_style(CURRENT_PATH);
  let cv = get_canvas();
  cv.appendChild(CURRENT_PATH);
  return CURRENT_PATH;
}

function get_document() {
  /*
   * ## `get_document`
   * - Categories: internal text
   * - Parameters: None
   * - Returns: A text document
   * - Behavior: Returns the current document, or creates and returns a new
   *     document if there isn't already a document on the page. Not normally
   *     required, as functions that need a document will call this
   *     automatically.
   * - See Also: new_document
   */
  if (CURRENT_DOCUMENT == undefined) {
    return new_document();
  } else {
    return CURRENT_DOCUMENT;
  }
}

function new_document() {
  /*
   * ## `new_document`
   * - Categories: context_control text
   * - Parameters: None
   * - Returns: A text document
   * - Behavior: Creates a new fresh text document and adds it to the page. Any
   *     text commands that follow this command will affect the new document
   *     instead of any previous documents that might have been created before.
   * - See Also: get_document, new_heading, new_paragraph, write_title, write,
   *     current_text_style
   */
  CURRENT_DOCUMENT = document.createElement('section');
  CURRENT_DOCUMENT.classList.add("document");
  CONTAINER.appendChild(CURRENT_DOCUMENT);
  CURRENT_PARAGRAPH = undefined;
  CURRENT_HEADING = undefined;

  // A download button to save the document as an HTML file.
  dl_button = document.createElement("button");
  dl_button.classList.add("dl_button")
  //dl_button.innerText = "💾";
  dl_button.innerText = "⬇";
  dl_button.addEventListener("click", function () {
    save_document(CURRENT_DOCUMENT);
  });

  CURRENT_DOCUMENT.appendChild(dl_button);

  return CURRENT_DOCUMENT;
}

function save_document(doc, filename) {
  /*
   * ## `save_document`
   *
   * - Categories: internal text
   * - Parameters:
   *     * doc: The DOM section element to save.
   *     * filename (optional): The file name for the download.
   * - Returns: nothing
   * - Behavior: Bundles up the given section element into a full standalone
   *     HTML file and offers it to the user as a download.
   * - See Also: new_document
   */
  // TODO
  if (filename == undefined) {
    filename = "expression_document.html";
  }

  // Grab innerHTML of document but without the download button:
  let dl_button = doc.querySelector(".dl_button");
  doc.removeChild(dl_button);
  let content = doc.innerHTML;
  doc.insertBefore(dl_button, doc.firstChild);

  // Assemble title, header, and footer
  let title = select_heading(0, doc).innerText;
  let ds = document.getElementById("document_style").outerHTML;
  let header = (
    "<!doctype html>\n<html>\n  <head>\n    <title>" + title + "</title>"
  + "\n    <meta charset='utf-8'/>\n    " + ds + "\n  </head>"
  + "\n  <body class='document'>\n"
  )
  // TODO: Include fonts?
  let footer = "\n  </body>\n</html>"

  // Put together the full document string
  let full_doc = header + content + footer

  // Offer it for download:
  var a = document.createElement('a');
  a.setAttribute(
    "href",
    "data:text/html;charset=utf-8," + encodeURIComponent(full_doc)
  );
  a.setAttribute("download", filename);
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

}

function get_paragraph() {
  /*
   * ## `get_paragraph`
   * - Categories: internal text
   * - Parameters: None
   * - Returns: The current paragraph
   * - Behavior: Returns the current paragraph of text, or creates and returns
   *     a new paragraph if there isn't a current paragraph.
   * - See Also: new_paragraph
   */
  if (CURRENT_PARAGRAPH == undefined) {
    return new_paragraph()
  } else {
    return CURRENT_PARAGRAPH;
  }
}

function new_paragraph() {
  /*
   * ## `new_paragraph`
   * - Categories: context_control text
   * - Parameters: None
   * - Returns: A new text paragraph
   * - Behavior: Creates a new text paragraph, which becomes the current
   *     paragraph. Text produced by the `write` command will be added to this
   *     new paragraph by default.
   * - See Also: get_paragraph, write
   */
  let cd = get_document();
  CURRENT_PARAGRAPH = document.createElement('p');
  cd.appendChild(CURRENT_PARAGRAPH);
  CURRENT_HEADING = undefined;
  return CURRENT_PARAGRAPH;
}

function get_heading() {
  /*
   * ## `get_heading`
   * - Categories: internal text
   * - Parameters: None
   * - Returns: The current heading
   * - Behavior: Returns the current text heading, or creates and returns a new
   *     heading if there isn't a current heading.
   * - See Also: new_heading
   */
  if (CURRENT_HEADING == undefined) {
    return new_heading();
  } else {
    return CURRENT_HEADING;
  }
}

function new_heading() {
  /*
   * ## `new_heading`
   * - Categories: context_control text
   * - Parameters: None
   * - Returns: A new text heading
   * - Behavior: Creates a new text heading, which becomes the current heading.
   *     Text produced by the `write_title` command will be added to this new
   *     heading by default.
   * - See Also: get_heading, write_title
   */
  let cd = get_document(); 
  CURRENT_HEADING = document.createElement('h1');
  cd.appendChild(CURRENT_HEADING);
  CURRENT_PARAGRAPH = undefined;
  return CURRENT_HEADING;
}

function get_audio() {
  /*
   * ## `get_audio`
   * - Categories: internal audio
   * - Parameters: None
   * - Returns: An audio player
   * - Behavior: Returns the current audio player, or creates and returns a new
   *     audio player if there isn't already one on the page. Not normally
   *     required, as functions that need an audio player will call this
   *     automatically.
   * - See Also: new_audio
   */
  if (CURRENT_AUDIO == undefined) {
    return new_audio();
  } else {
    return CURRENT_AUDIO;
  }
}

function new_audio() {
  /*
   * ## `new_audio`
   * - Categories: context_control audio
   * - Parameters: None
   * - Returns: A new audio player
   * - Behavior: Creates a new fresh audio player and adds it to the page. Any
   *     audio commands that follow this command will affect the new player
   *     instead of any previous players that might have been created before.
   * - See Also: get_audio, new_track, add_note
   */
  let ctx = new AudioContext();

  // We let the DOM div be the coordinating variable.
  CURRENT_AUDIO = document.createElement("div");
  CURRENT_AUDIO.classList.add("audio")

  // Special variables:
  CURRENT_AUDIO._tracks_ = []; // tracks attached to this audio player
  CURRENT_AUDIO._track_states_ = [];
  CURRENT_AUDIO._ctx_ = ctx; // the AudioContext object
  CURRENT_AUDIO._unmute_vol_ = 0.25; // volume to resume playing at

  // Final gain node
  ctx._final_gain_ = ctx.createGain(); // gain node for final volume
  ctx._final_gain_.gain.value = CURRENT_AUDIO._unmute_vol_;
  ctx._final_gain_.connect(ctx.destination);

  // Start the context suspended:
  ctx.suspend();
  CURRENT_AUDIO._play_state_ = "stopped";

  // Rewind button:
  let reset = document.createElement("input");
  reset.classList.add("reset");
  reset.type = "button";
  reset.value = RESET_SYMBOL;
  reset.addEventListener(
    "click",
    function () { reset_audio(this.parentNode); }
  );
  CURRENT_AUDIO.appendChild(reset);

  // Play/pause button:
  let playpause = document.createElement("input");
  playpause.classList.add("playpause");
  playpause.type = "button";
  playpause.value = PLAY_SYMBOL;
  playpause.addEventListener(
    "click",
    function () { toggle_play(this.parentNode); }
  );
  CURRENT_AUDIO.appendChild(playpause);

  // Volume icon:
  let volsymbol = document.createElement("a");
  volsymbol.classList.add("vol-symbol");
  volsymbol.href = "#";
  volsymbol.innerText = SPEAKER_SYMBOL;
  volsymbol.addEventListener(
    "click",
    function () {
      if (this.innerText == SPEAKER_SYMBOL) {
        toggle_mute(this.parentNode, true);
      } else {
        this.innerText = SPEAKER_SYMBOL;
        this.nextSibling.disabled = false; // disable volume slider
        toggle_mute(this.parentNode, false);
      }
    }
  );
  CURRENT_AUDIO.appendChild(volsymbol);

  // Volume slider
  let vol = document.createElement("input");
  vol.classList.add("vol-slider");
  vol.type = "range";
  vol.min = 0;
  vol.max = 100;
  vol.value = CURRENT_AUDIO._unmute_vol_*100;
  vol.addEventListener(
    "input",
    function () {
      set_volume(this.parentNode, this.value/100, false);
    }
  );
  CURRENT_AUDIO.appendChild(vol);

  // A download button to save the audio to disk.
  dl_button = document.createElement("button");
  dl_button.classList.add("dl_button")
  //dl_button.innerText = "💾";
  dl_button.innerText = "⬇";
  dl_button.addEventListener("click", function () {
    save_audio(CURRENT_AUDIO);
  });
  CURRENT_AUDIO.appendChild(dl_button);

  // Wrap things up
  CONTAINER.appendChild(CURRENT_AUDIO);
  CURRENT_TRACK = undefined;
  return CURRENT_AUDIO;
}

function save_audio(audio, filename) {
  /*
   * ## `save_audio`
   *
   * - Categories: internal audio
   * - Parameters:
   *     * audio: The audio element to save.
   *     * filename (optional): The file name for the download.
   * - Returns: nothing
   * - Behavior: Encodes the tracks of the given audio element into a .WAV file
   *     and offers it to the user as a download.
   * - See Also: new_canvas
   */
  if (filename == undefined) {
    filename = "expression_audio.wav";
  }

  // TODO
  wav_data = "";

  var a = document.createElement('a');
  a.setAttribute(
    "href",
    // TODO
    "data:audio/wav;" + encodeURIComponent(wav_data)
  );
  a.setAttribute("download", filename);
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function get_track() {
  /*
   * ## `get_track`
   * - Categories: internal audio
   * - Parameters: None
   * - Returns: An audio track
   * - Behavior: Returns the current audio track, or creates and returns a new
   *     track within the current audio player if there isn't already a track.
   *     Not normally required, as functions that need an audio track will call
   *     this automatically.
   * - See Also: new_track
   */
  if (CURRENT_TRACK == undefined) {
    return new_track();
  } else {
    return CURRENT_TRACK;
  }
}

function new_track() {
  /*
   * ## `new_track`
   * - Categories: context_control audio
   * - Parameters: None
   * - Returns: A new audio track
   * - Behavior: Creates a new audio track within the current audio player, and
   *     sets it as the current track. `add_note` calls that come after this
   *     will affect the new track instead of any previous tracks.
   * - See Also: get_track, add_note
   */
  let ca = get_audio();
  CURRENT_TRACK = {
    "audio": ca,
    "keys": {},
    "notes": []
  }; // TODO
  add_track(ca, CURRENT_TRACK);
  setup_track(CURRENT_TRACK, undefined); // TODO: Instruments!
  return CURRENT_TRACK;
}

/*----------------------- Text Style Functions -------------------------------*/

function current_text_style() {
  /*
   * ## `current_text_style`
   * - Categories: internal text
   * - Parameters: None
   * - Returns: A string describing the style used for writing text.
   * - Behavior: Returns the current style settings for text, like the font,
   *     font weight, and text decoration.
   * - See Also: get_document, set_text_style
   */
  let cs = TEXT_STYLE;
  let style = "";
  for (let k of Object.keys(cs)) {
    if (cs[k] != DEFAULT_TEXT_STYLE[k]) {
      style += k + ": " + cs[k] + "; "
    }
  }
  return style;
}

function set_text_style(property, value) {
  /*
   * ## `set_text_style`
   * - Categories: internal text
   * - Parameters:
   *    * property: The style property to set.
   *    * value: The new value for that property.
   * - Returns: None
   * - Behavior: Changes one property of the current text style. There are more
   *     specific functions for key style properties, but this can be used to
   *     alter any valid CSS style property.
   * - See Also: current_text_style, set_font, set_bold, set_underline,
   *    set_italic, set_text_color
   */
  TEXT_STYLE[property] = value;
}

function clear_text_style() {
  /*
   * ## `check_text_style`
   * - Categories: style_control text
   * - Parameters: None
   * - Returns: Nothing
   * - Behavior: Resets all text styles back to the default (14pt non-bold
   *     non-underlined non-italic black serif). // TODO: Built-in fonts
   * - See Also: set_text_style, clear_text_style
   */
  TEXT_STYLE = {};
}

function check_text_style() {
  /*
   * ## `check_text_style`
   * - Categories: style_control text
   * - Parameters: None
   * - Returns: A string describing the current text style.
   * - Behavior: Checks the current text style settings and builds a string to
   *     describe the most important style settings, which are the following:
   *
   *     - size
   *     - bold
   *     - underline
   *     - italic
   *     - color
   *     - font
   *
   *     Size and font are always included, and the rest of the properties are
   *     only included if they're different from the default (non-bold,
   *     non-underlined, non-italic black). So for example this function might
   *     return a string like:
   *
   *       "14pt underlined red TeX Gyre Pagella"
   * - See Also: set_text_style, clear_text_style
   */
  let result = "";
  if (TEXT_STYLE.hasOwnProperty("font-size")) {
    result += TEXT_STYLE["font-size"];
  } else {
    result += DEFAULT_TEXT_STYLE["font-size"];
  }
  if (
    TEXT_STYLE.hasOwnProperty("font-weight")
 && TEXT_STYLE["font-weight"] == "bold"
  ) {
    result += " bold";
  }
  if (
    TEXT_STYLE.hasOwnProperty("text-decoration")
 && TEXT_STYLE["text-decoration"] == "underline"
  ) {
    result += " underlined";
  }
  if (
    TEXT_STYLE.hasOwnProperty("font-style")
 && TEXT_STYLE["font-style"] == "italic"
  ) {
    result += " italic";
  }
  // TODO: better color translation
  if (
    TEXT_STYLE.hasOwnProperty("color")
 && TEXT_STYLE["color"] != "black"
  ) {
    result += " " + TEXT_STYLE["color"];
  }
  if (TEXT_STYLE.hasOwnProperty("font-family")) {
    let ff = TEXT_STYLE["font-family"];
  } else {
    let ff = DEFAULT_TEXT_STYLE["font-family"];
  }
  if (ff.indexOf(' ') >= 0) {
    ff = ff.slice(0, ff.indexOf(' '));
  }
  result += ff;
  return result;
}

function load_font(script, style) {
  /*
   * ## `load_font`
   * - Categories: internal text fonts
   * - Parameters:
   *    * script: A string identifying a script/language
   *    * style (optional): A string specifying a letter style
   * - Returns: None
   * - Behavior: Adds a link to the page that loads a font appropriate for the
   *     given style and language. Available languages and styles are based on
   *     the Google Noto project fonts. If the style is unspecified, the first
   *     available style for the given script will be used, with serif or
   *     otherwise unsimplified forms being preferred. See [available
   *     scripts](#available_scripts) and [script styles](#script_styles) for
   *     more information about what is available.
   * - See Also: current_text_style, set_bold, set_underline, set_italic,
   *     available_scripts, script_styles
   */
}

function set_font(script, style) {
  /*
   * ## `set_font`
   * - Categories: style_control text fonts
   * - Parameters:
   *    * script: A string identifying a script/language
   *    * style (optional): A string specifying a letter style
   * - Returns: None
   * - Behavior: Changes the current font. New text created after this point
   *     will use the new font, but already-created text will not be affected.
   *     An attempt will be made to load the selected font from the internet,
   *     but if this doesn't work, local installed fonts will be used which
   *     might not exactly match the requested script and style. See
   *     [available scripts](#available_scripts) for a list of scripts and
   *     styles.
   * - See Also: current_text_style, set_bold, set_underline, set_italic
   */
  // TODO: Font library!
  set_text_style("font-family", font_name + ", serif;");
}

function set_bold(on) {
  /*
   * ## `set_bold`
   * - Categories: style_control text
   * - Parameters:
   *    * on: Either true or false
   * - Returns: None
   * - Behavior: Sets the current font style to be either bold or
   *     normal-weight, depending on whether the `on` parameter is true (bold
   *     font) or false (normal weight). Only affects text created afterwards.
   * - See Also: current_text_style, set_font, set_underline, set_italic
   */
  if (on) {
    set_text_style("font-weight", "bold");
  } else {
    set_text_style("font-weight", "normal");
  }
}

function set_underline(on) {
  /*
   * ## `set_underline`
   * - Categories: style_control text
   * - Parameters:
   *    * on: Either true or false
   * - Returns: None
   * - Behavior: Sets the current font style to be either underlined or not,
   *     depending on whether the `on` parameter is true (underline) or false
   *     (no underline). Only affects text created afterwards.
   * - See Also: current_text_style, set_font, set_bold, set_italic
   */
  if (on) {
    set_text_style("text-decoration", "underline");
  } else {
    set_text_style("text-decoration", "none");
  }
}

function set_italic(on) {
  /*
   * ## `set_italic`
   * - Categories: style_control text
   * - Parameters:
   *    * on: Either true or false
   * - Returns: None
   * - Behavior: Sets the current font style to be either italic or not,
   *     depending on whether the `on` parameter is true (italic) or false
   *     (normal shape). Only affects text created afterwards.
   * - See Also: current_text_style, set_font, set_bold, set_underline
   */
  if (on) {
    set_text_style("font-style", "italic");
  } else {
    set_text_style("font-style", "normal");
  }
}

function set_text_color(color) {
  /*
   * ## `set_text_color`
   * - Categories: style_control text
   * - Parameters:
   *    * color: The name of a color, like 'red' or 'blue'.
   * - Returns: None
   * - Behavior: Sets the color for text. The color parameter must be specified
   *     as a 6-digit hexadecimal color value (see `pick_color`);
   * - See Also: current_text_style, set_font, set_bold, set_underline
   */
  if (on) {
    set_text_style("font-style", "italic");
  } else {
    set_text_style("font-style", "normal");
  }
}

// TODO
//function pick_color(


/*--------------------- Text Creation Functions ------------------------------*/

function write(words, spacing) {
  /*
   * ## `write`
   * - Categories: create text
   * - Parameters:
   *    * words: The text to add
   *    * spacing (optional): Whether to automatically add spacing next to the
   *        text; defaults to true.
   * - Returns: None
   * - Behavior: Adds new text to the current paragraph, or starts a new
   *     paragraph (and possibly a new document) if there isn't a current
   *     paragraph. Normally, it just needs one argument, but a second argument
   *     of `false` can be supplied to prevent extra spaces from appearing at
   *     the edges of the text added, if you want two different `write` calls
   *     to produce text that doesn't have a space in between.
   * - See Also: new_document, new_paragraph, write_title, write_link, set_font,
   *     current_text_style
   */
  if (spacing == undefined) { spacing = true; }
  if (spacing) { words = ' ' + words + ' '; }
  let cp = get_paragraph()
  let sp = document.createElement("span");
  sp.innerText = words;
  sp.style = current_text_style();
  cp.appendChild(sp)
}

function write_exact(words) {
  /*
   * ## `write_exact`
   * - Categories: create text alias
   * - Parameters:
   *   words - The text to add
   * - Returns: None
   * - Behavior: Just an alias for `write` with a second argument of `false`,
   *     meaning that no extra spaces will be added automatically.
   * - See Also: write
   */
  write(words, false);
}

function write_link(words, url) {
  /*
   * ## `write_link`
   * - Categories: create text
   * - Parameters:
   *    * words: The text to add
   *    * url: the URL to link to
   * - Returns: None
   * - Behavior: Adds a hyperlink to the current paragraph. The URL should
   *     start with `https://` unless you want the link to go to another
   *     document that's on the same server as the current project. The link
   *     will use any currently active text styles, like bold or underline, but
   *     regardless of those styles it will always be underlined, and unless
   *     another color is specified, it will be gray instead of black.
   * - See Also: write_title, write, set_text_color
   */
  let cp = get_paragraph()
  let a = document.createElement("a");
  a.href = url;
  a.innerText = words;
  a.style = current_text_style();
  cp.appendChild(a);
}

function write_title(words) {
  let ch = get_heading()
  let sp = document.createElement("span");
  sp.innerText = words;
  sp.style = current_text_style();
  ch.appendChild(sp)
}

/*------------------------ Text Manipulation Functions -----------------------*/

function select_heading(index, doc) {
  if (doc == undefined) {
    doc = get_document();
  }
  if (index == undefined) {
    index = 0;
  }
  let headings = [];
  for (let child of doc.childNodes) {
    if (child.nodeName == "H1") {
      headings.push(child);
    }
  }
  if (index < 0) {
    index = headings.length + index;
  }
  return headings[index];
}

/*----------------------- Audio Setup/Control Functions ----------------------*/

function add_track(audio, track) {
  /*
   * add_track
   *
   * Parameters:
   *   audio - an audio player
   *   track - the track to be added
   *
   * Returns: Nothing
   *
   * Behavior: Adds the given track to the given audio player, so that when
   *   that player is played, the track will play.
   *
   * See Also: get_track, add_note
   */
  audio._tracks_.push(track);
  audio._track_states_.push({"next_note": 0, "target_time": undefined});
}

function track_count() {
  /*
   * track_count
   *
   * Parameters: None
   *
   * Returns: A number
   *
   * Behavior: Returns the number of tracks in the current audio player.
   *
   * See Also: get_audio, get_track, select_track
   */
  let ca = get_audio();
  return ca._tracks_.length;
}

function select_track(n) {
  /*
   * select_track
   *
   * Parameters:
   *   n - a track number
   *
   * Returns: The selected track.
   *
   * Behavior: sets the CURRENT_TRACK variable to the nth track from the
   *   current audio player. If there aren't enough tracks, returns undefined
   *   (and sets CURRENT_TRACK to undefined).
   *
   * See Also: get_audio, get_track, track_count
   */
  let ca = get_audio();
  let tr = ca._tracks_[n];
  CURRENT_TRACK = tr;
  return tr;
}

function setup_track(track, instrument) {
  /*
   * setup_track
   *
   * Parameters:
   *   track - an audio track
   *   instrument - the instrument to use for the track
   *
   * Returns: Nothing
   *
   * Behavior: Sets up the default array of oscillator, filter, and gain nodes
   *   for a track.
   *
   * See Also: new_audio, add_note
   */
  // TODO: Instruments
  let ctx = track.audio._ctx_;

  // For each octave and each semitone within that octave, create an oscillator
  // connected to a gain node. Store these under letter names in the 'keys'
  // property of the track:
  for (let octave of OCTAVES) {
    for (let i = 0; i < SEMITONE_FREQUENCIES.length; ++i) {
      let hz = SEMITONE_FREQUENCIES[i];
      let letter = TONE_LETTERS[i] + octave; // octave incorporated
      // Adjust frequency by octave:
      if (octave == '--') {
        hz /= 4;
      } else if (octave == '-') {
        hz /= 2;
      } else if (octave == '+') {
        hz *= 2
      } else if (octave == '++') {
        hz *= 4
      }

      // Create oscillator and gain nodes:
      let osc = ctx.createOscillator();
      osc.frequency.value = hz;
      osc.detune.value = 0;
      osc.type = "sine";
      osc.start();
      let gain = ctx.createGain();
      gain.gain.value = 0; // start off muted;
      osc.connect(gain);
      gain.connect(ctx._final_gain_);
      // Store gain node for easy access later
      track.keys[letter] = {"osc": osc, "gain": gain};
    }
  }
  // Add duplicate entries into the track's keys map for numbers 0 through 4
  // to represent a pentatonic scale (and smaller/larger numbers for octave
  // offsets of the pentatonic scale). A2 is numbered -10 so that A4 can be 0.
  for (let o = 0; o < OCTAVES.length; ++o) {
    for (let i = 0; i < PENTATONIC_LETTERS.length; ++i) {
      let letter = PENTATONIC_LETTERS[i] + OCTAVES[o];
      let number = PENTATONIC_LETTERS.length * (o-2) + i;
      track.keys[number] = track.keys[letter];
    }
  }
}

function schedule_audio(audio) {
  /*
   * schedule_audio
   *
   * Parameters:
   *   audio - an audio player
   *
   * Returns: Nothing
   *
   * Behavior: Schedules upcoming notes for all tracks of the given audio
   *   player within the next SCHEDULING_LOOKAHEAD milliseconds, and gets
   *   called every SCHEDULING_INTERVAL milliseconds so that each note gets
   *   scheduled on time.
   *
   * See Also: toggle_play, schedule_note
   */
  let ctx = audio._ctx_;
  let now = ctx.currentTime;
  let elapsed = now - audio._started_at_;

  // Schedule notes for each track:
  for (let i = 0; i < audio._tracks_.length; ++i) {
    let track = audio._tracks_[i];
    let state = audio._track_states_[i];
    if (state.target_time == undefined) { state.target_time = now; }
    while (state.target_time < now + SCHEDULING_LOOKAHEAD) {
      let note = track.notes[state.next_note];
      if (note == undefined) { break; } // no notes in track
      // at least 1 note in track after this point
      schedule_note(track, note, state.target_time);
      // advance target time
      state.target_time += note.duration;
      // advance note in track since we've scheduled one
      state.next_note = (state.next_note + 1) % track.notes.length;
    }
  }
}

function schedule_note(track, note, when) {
  /*
   * queue_notes
   *
   * Parameters:
   *   track - an audio track
   *   note - a note object with a tone and a duration
   *   when - the time relative to a track's audio context that the note should
   *    start.
   *
   * Returns: Nothing
   *
   * Behavior: Queues up oscillator starts/stops and gain changes for the
   *   current given note.
   *
   * See Also: schedule_audio
   */
  if (note.tone == "-") { return; } // a rest; do nothing
  let key = track.keys[note.tone];
  // TODO: Error handling!
  key.gain.gain.setValueAtTime(0, when);
  key.gain.gain.linearRampToValueAtTime(
    1,
    when + ATTACK_TIME*note.duration
  );
  key.gain.gain.setValueAtTime(
    1,
    when + (ATTACK_TIME+SUSTAIN_TIME)*note.duration
  );
  key.gain.gain.linearRampToValueAtTime(0, when + note.duration);
}

function track_duration(track) {
  /*
   * track_duration
   *
   * Parameters:
   *   track - a track
   *
   * Returns: A number
   *
   * Behavior: Returns the full duration of the given track in seconds.
   *
   * See Also: new_track, add_note
   */
  let dur = 0;
  for (let note of track.notes) {
    dur += note.duration;
  }
  return dur;
}

function toggle_play(audio, play) {
  /*
   * toggle_play
   *
   * Parameters:
   *   audio - an audio player
   *   play (optional) - true for play, false for pause, omit to swap based on
   *     current state.
   *
   * Returns: Nothing
   *
   * Behavior: If currently playing or if `play` is given as false, pauses the
   *   given audio player, and updates the controls to show a play button.
   *   Otherwise, it resumes play, and updates the controls to show a pause
   *   button.
   *
   * See Also: new_audio, toggle_mute, schedule_audio
   */
  // TODO: Set/toggle aria-checked!
  if (play == undefined) {
    play = audio._play_state_ != "playing";
  }
  let ctx = audio._ctx_;
  if (play) {
    audio.querySelector(".playpause").value = PAUSE_SYMBOL;
    ctx.resume();
    if (audio._play_state_ == "stopped") {
      audio._started_at_ = ctx.currentTime;
    }
    // fire up the audio scheduler:
    audio._scheduler_ = setInterval(schedule_audio, SCHEDULING_INTERVAL, audio);
    audio._play_state_ = "playing";
  } else {
    audio.querySelector(".playpause").value = PLAY_SYMBOL;
    ctx.suspend();
    clearInterval(audio._scheduler_);
    audio._scheduler_ = undefined;
    audio._play_state_ = "paused";
  }
}

function reset_audio(audio) {
  /*
   * reset_audio
   *
   * Parameters:
   *   audio - an audio player
   *
   * Returns: Nothing
   *
   * Behavior: Stops the audio player and resets its state so that playing will
   *   start over from the beginning.
   *
   * See Also: new_audio, toggle_play
   */
  let ctx = audio._ctx_;
  toggle_play(audio, false);
  audio._play_state_ = "stopped";
  clearInterval(audio._scheduler_);

  // Reset track states
  for (let ts of audio._track_states_) {
    ts.next_note = 0;
    ts.target_time = undefined;
  }

  for (let tr of audio._tracks_) {
    for (let tone of Object.keys(tr.keys)) {
      let key = tr.keys[tone];
      key.gain.gain.cancelScheduledValues(ctx.currentTime);
      key.gain.gain.value = 0;
    }
  }
}

function toggle_mute(audio, mute) {
  /*
   * toggle_mute
   *
   * Parameters:
   *   audio - an audio player
   *   mute (optional) - true for mute, false for unmute, omit to swap based on
   *     current state.
   *
   * Returns: Nothing
   *
   * Behavior: If currently muted or if `mute` is given as true, mutes the
   *   given audio player, setting the master volume to 0, disabling the volume
   *   slider, and showing a mute icon. Otherwise, it unmutes, setting the
   *   volume back to the value before it was muted, re-enabling the volume
   *   slider, and displaying a speaker icon instead of a mute icon.
   *
   * See Also: new_audio, toggle_play
   */
  if (mute) {
    audio.querySelector(".vol-symbol").innerText = MUTE_SYMBOL;
    audio.querySelector(".vol-slider").disabled = true;
    audio._unmute_vol_ = audio._ctx_._final_gain_.gain.value;
    let ctx = audio._ctx_;
    ctx._final_gain_.gain.setValueAtTime(0, ctx.currentTime);
  } else {
    audio.querySelector(".vol-symbol").innerText = SPEAKER_SYMBOL;
    audio.querySelector(".vol-slider").disabled = false;
    let ctx = audio._ctx_;
    ctx._final_gain_.gain.setValueAtTime(audio._unmute_vol_, ctx.currentTime);
  }
}

function set_volume(audio, value, update_slider) {
  /*
   * TODO: HERE
   * set_volume
   *
   * Parameters:
   *   audio - an audio player
   *   value - a number between 0 and 1 (inclusive)
   *   update_slider (optional) - true or false; should slider be moved?
   *
   * Returns: Nothing
   *
   * Behavior: Updates the master gain node for the given audio to the provided
   *   volume value. If update_slider is omitted or set to true, the volume
   *   slider for the audio controls will be moved to correspond to the new
   *   value. If update_slider is given as false, the slider will not be
   *   adjusted (this is useful if the set_volume function is being called
   *   because the slider already updated to prevent a loop).
   *
   * See Also: new_audio, toggle_mute
   */
  if (update_slider == undefined) { update_slider = true; }
  if (update_slider) {
    let slider = audio.querySelector(".vol-slider");
    slider.value = 100*value;
  }
  let ctx = audio._ctx_;
  ctx._final_gain_.gain.setValueAtTime(value, ctx.currentTime);
}


/*------------------------ Audio Creation Functions --------------------------*/

function add_note(tone, duration) {
  /*
   * ## `add_note`
   * - Parameters:
   *    * tone: a tone letter or number, like 'A', 'C#', or 'Eb'.
   *    * duration: a duration in seconds, or a letter like 'e' or 'h'.
   * - Returns: Nothing
   * - Behavior: Adds a note to the current track, using the given tone, which
   *     should be specified using either a number for pentatonic scale or a
   *     letter (plus accident and/or octave modifiers) for classical scale.
   *     For example, "A", "C#", "Eb", "B--", "-5", and "3" are all valid tone
   *     specifications. When using a letter, add '--', '-', '+', or '++' to
   *     the end to shift the tone up or down by up to two octaves. '#' and 'b'
   *     are used for sharp and flat modifiers. Using numbers for a pentatonic
   *     scale, 0 corresponds to A, 1 to C, 2 to D, 3 to E, and 4 to G.
   *     Negative numbers or higher positive numbers are tones in higher or
   *     lower octaves, so -5 is one octave below 0 (equivalent to "A-"), and
   *     the full range allowed is between -10 and 14 (inclusive). Pentatonic
   *     tones may not have sharp/flat modifiers.
   *
   *     For the duration, a numerical value in seconds may be given, or a
   *     letter to indicate the fraction of a measure:
   *    
   *       't' - thirty-second note
   *       's' - sixteenth note
   *       'e' - eighth note
   *       'q' - quarter note
   *       'h' - half note
   *       'f' - full note
   *    
   *     When a letter is given, 108 BPM in 4:4 time is used to compute the
   *     note duration. A letter may also be followed by a period (e.g., 'q.'
   *     or 'h.') to indicate a dotted note, which is 1.5 times as long as it
   *     would be otherwise.
   * - See Also: get_track, add_rest, queue_notes
   */
  let dur = duration;
  if (typeof(duration) === 'string' || duration instanceof String) {
    if (duration[0] == "t") {
      dur = 1/32 * FULL_NOTE_LENGTH;
    } else if (duration[0] == "s") {
      dur = 1/16 * FULL_NOTE_LENGTH;
    } else if (duration[0] == "e") {
      dur = 1/8 * FULL_NOTE_LENGTH;
    } else if (duration[0] == "q") {
      dur = 1/4 * FULL_NOTE_LENGTH;
    } else if (duration[0] == "h") {
      dur = 1/2 * FULL_NOTE_LENGTH;
    } else if (duration[0] == "f") {
      dur = FULL_NOTE_LENGTH;
    } else {
      // TODO: Error handling!
      console.warn(
        "Error: unknown duration value '" + duration +
        "'. Using quarter note as a fallback."
      );
    }
    if (duration.length > 1) {
      if (duration[1] == '.') {
        dur *= 1.5;
      } else {
        console.warn(
          "Error: unknown duration modifier '" + duration.slice(1) +
          "'. Using base duration without modification."
        );
      }
    }
  }
  // TODO: Filter for tone errors here!
  if (typeof tone === "string" || tone instanceof String) {
    if (tone.length > 1 && tone[1] == 'b') { // convert flats to sharps
      let letter = tone[0];
      let rest = tone.slice(2);
      let li = BASE_LETTERS.indexOf(letter);
      if (li == 0) {
        li = BASE_LETTERS.length - 1;
      } else {
        li -= 1;
      }
      let alt_tone = BASE_LETTERS[li] + '#';
      if (TONE_LETTERS.indexOf(alt_tone) >= 0) {
        tone = alt_tone + rest;
      } else {
        console.warn(
          "Error: tone '" + tone + "' could not be converted to a sharp."
        );
      }
    }
  }
  let note = {"tone": tone, "duration": dur };
  let ct = get_track();
  ct.notes.push(note);
}

function add_rest(duration) {
  /*
   * ## add_rest
   * - Parameters:
   *    * duration: A duration number in seconds or a letter (see `add_note`)
   * - Returns: Nothing
   * - Behavior: Works just like add_note, but adds a length of silence to the
   *     current track instead of a note. The duration is specified using the
   *     same rules for the `add_note` function.
   * - See Also: add_note
   */
  add_note('-', duration);
}

/*---------------------------- Vector Functions ------------------------------*/

function v_length(v) {
  /*
   * ## `v_length`
   * - Parameters:
   *    * v: a vector
   * - Returns: A number.
   * - Behavior: The result is the length of the given vector. It is computed
   *     as:
   *
   *     √(v[0]² + v[1]²)
   * - See Also: v_scale
   */
  return Math.sqrt(v[0]*v[0] + v[1]*v[1]);
}

function v_scale(v, s) {
  /*
   * ## `v_scale`
   * - Parameters:
   *    * v: the vector
   *    * s: the scale factor
   * - Returns: A new vector (does not modify the given vector).
   * - Behavior: The result is a new vector that is a scaled-up or scaled-down
   *     version of the original vector. Each component of the given vector is
   *     multiplied by the scaling factor.
   * - See Also: v_add, v_dot
   */
  return [v[0] * s, v[1] * s];
}

function v_norm(v) {
  /*
   * ## `v_norm`
   * - Parameters:
   *    * v: a vector
   * - Returns: A new vector (does not modify the given vector).
   * - Behavior: The result is a new vector that points in the same direction
   *     as the original but which is exactly 1 unit long. This is the same as
   *     applying v_scale(v, 1/v_length(v)). If the original vector is
   *     0-length, this function will generate an error.
   * - See Also: v_length, v_scale
   */
  return v_scale(v, 1/v_length(v));
}


function v_add(v1, v2) {
  /*
   * ## `v_add`
   * - Parameters:
   *    * v1: the first vector
   *    * v2: the second vector
   * - Returns: A new vector.
   * - Behavior: The result is the vector sum of the two vectors given, which
   *     is computed as:
   *
   *     [
   *       v1[0] + v2[0],
   *       v1[1] + v2[1]
   *     ]
   * - See Also: v_scale, v_sub
   */
  return [v1[0] + v2[0], v1[1] + v2[1]];
}

function v_sub(v1, v2) {
  /*
   * ## `v_sub`
   * - Parameters:
   *   * v1: the first vector
   *   * v2: the second vector
   * - Returns: A new vector.
   * - Behavior: The result is the first vector minus the second, which is:
   *
   *     [
   *       v1[0] - v2[0],
   *       v1[1] - v2[1]
   *     ]
   *
   * - See Also: v_add
   */
  return [v1[0] - v2[0], v1[1] - v2[1]];
}

function v_dot(v1, v2) {
  /*
   * ## v_dot
   * - Parameters:
   *     * v1: the first vector
   *     * v2: the second vector
   * - Returns: A number.
   * - Behavior: The result is the dot product of the two vectors, which is:
   *
   *     v1[0] * v2[0] + v1[1] * v2[1]
   *
   *     Note that the dot product of two vectors v1 and v2 is equal to the
   *     product of the lengths of each vector and the cosine of the angle
   *     between them:
   *
   *     v_dot(v1, v2) == v_length(v1)*v_length(v2) * Math.cos(v_angle(v1, v2))
   *
   * See Also: v_length, v_scale, v_angle, v_add
   */
  return v1[0] * v2[0] + v1[1] * v2[1];
}

function v_angle(v1, v2) {
  /*
   * ## `v_angle`
   * - Parameters:
   *    * v1: the first vector
   *    * v2: the second vector
   * - Returns: A number in degrees (not radians).
   * - Behavior: The result is the angle (in degrees, not radians) between the
   *     two vectors. If either vector has length 0 this will result in an
   *     error. The value returned will be the smaller of the two ways to
   *     measure the angle between the vectors, and will always be positive,
   *     regardless of direction between the vectors.
   * - See Also: v_length, v_dot, v_rotation
   */
  let cos = v_dot(v1, v2);
  cos /= v_length(v1);
  cos /= v_length(v2);
  return Math.acos(cos) * 180 / Math.PI;
}

function v_rotation(v1, v2) {
  /*
   * ## `v_rotation`
   * - Parameters:
   *    * v1: the first vector
   *    * v2: the second vector
   * - Returns: A number in degrees (not radians).
   * - Behavior: The same result as v_angle, except that it will be positive
   *     for counter-clockwise rotations and negative for clockwise rotations.
   * - See Also: v_rotation
   */
  let a1 = v_angle([1, 0], v1);
  let a2 = v_angle([1, 0], v2);
  if (v1[1] < 0) { a1 = -a1; }
  if (v2[1] < 0) { a2 = -a2; }
  let result = a2 - a1;
  if (result > 180) {
    return result - 360;
  } else if (result < -180) {
    return result + 360;
  } else {
    return result;
  }
}

function deg2rad(deg) {
  return Math.PI * deg / 180;
}

function rad2deg(deg) {
  return 180 * deg / Math.PI;
}

function cancel_rotations(angle) {
  while (angle > 2*Math.PI) {
    angle -= 2*Math.PI;
  }
  while (angle < 0) {
    angle += 2*Math.PI;
  }
  return angle;
}

function v_proj(v1, v2) {
  /*
   * ## `v_proj`
   * - Parameters:
   *    * v1: the first vector
   *    * v2: the second vector
   * - Returns: A vector
   * - Behavior: Returns the vector projection of v1 onto v2.
   * - See Also: v_angle
   */
  let th = deg2rad(v_angle(v1, v2));
  let ma = v_length(v1);
  let pl = ma * Math.cos(th);
  return v_scale(v_norm(v2), pl);
}

// Floating point equality constant
var EPSILON = 1e-7;
function v_same(v1, v2) {
  return (
    Math.abs(v1[0] - v2[0]) < EPSILON
 && Math.abs(v1[1] - v2[1]) < EPSILON
  );
}

/*------------------------ Drawing Style Functions ---------------------------*/

function current_drawing_style() {
  /*
   * ## `current_drawing_style`
   * - Parameters: None
   * - Returns: An object describing the style used for drawing.
   * - Behavior: Returns the current style settings for drawing, like the
   *     stroke/fill colors and the stroke width. This will be a mix of the
   *     default drawing style and any other active styles.
   * - See Also: get_canvas, set_drawing_style, apply_drawing_style
   */
  let result = {};
  for (let k of Object.keys(DEFAULT_DRAWING_STYLE)) {
    result[k] = DEFAULT_DRAWING_STYLE[k];
  }
  for (let k of Object.keys(DRAWING_STYLE)) {
    result[k] = DRAWING_STYLE[k];
  }
  return result;
}

function set_drawing_style(property, value) {
  DRAWING_STYLE[property] = value;
}

function clear_drawing_style(property) {
  delete DRAWING_STYLE[property];
}

function apply_drawing_style(obj) {
  let ds = current_drawing_style();
  for (let k of Object.keys(ds)) {
    obj.setAttributeNS(null, k, ds[k]);
  }
}

function put_on_canvas(obj) {
  let cv = get_canvas();
  cv.appendChild(obj);
}

// Shortcut functions for common drawing properties:
function set_stroke_color(color) { set_drawing_style('stroke', color); }
function set_stroke_width(width) { set_drawing_style('stroke-width', width); }
function set_fill_color(color) { set_drawing_style('fill', color); }

/*--------------------------- Drawing Functions ------------------------------*/

function draw_rectangle(center, width, height) {
  let rect = document.createElementNS(SVGNS, "rect");
  rect.setAttributeNS(null, 'x', center[0] - width/2);
  rect.setAttributeNS(null, 'y', center[1] - height/2);
  rect.setAttributeNS(null, 'width', width);
  rect.setAttributeNS(null, 'height', height);
  apply_drawing_style(rect);
  put_on_canvas(rect);
}

function draw_circle(center, radius) {
  let circle = document.createElementNS(SVGNS, "circle");
  circle.setAttributeNS(null, 'cx', center[0]);
  circle.setAttributeNS(null, 'cy', center[1]);
  circle.setAttributeNS(null, 'r', radius);
  apply_drawing_style(circle);
  put_on_canvas(circle);
}

function draw_ellipse(center, radius, ratio) {
  let angle = v_rotation([1, 0], radius);
  let r1 = v_length(radius);
  let r2 = r1 * ratio;
  let ellipse = document.createElementNS(SVGNS, "ellipse");
  ellipse.setAttributeNS(null, 'cx', center[0]);
  ellipse.setAttributeNS(null, 'cy', center[1]);
  ellipse.setAttributeNS(
    null,
    'transform', "rotate(" + angle + ", " + center[0] + ", " + center[1] + ")"
  );
  ellipse.setAttributeNS(null, 'rx', r1);
  ellipse.setAttributeNS(null, 'ry', r2);
  apply_drawing_style(ellipse);
  put_on_canvas(ellipse);
}

function draw_line(from, to) {
  let line = document.createElementNS(SVGNS, "line");
  line.setAttributeNS(null, 'x1', from[0]);
  line.setAttributeNS(null, 'y1', from[1]);
  line.setAttributeNS(null, 'x2', to[0]);
  line.setAttributeNS(null, 'y2', to[1]);
  apply_drawing_style(line);
  put_on_canvas(line);
}

function get_last_path_command() {
  let path = get_path();
  let data = path.getAttributeNS(null, 'd');
  let bits = data.split(' ');
  let r = /[A-Za-z]/;
  let found = [];
  for (let i = bits.length - 1; i >= 0; --i) {
    let b = bits[i];
    found.unshift(b);
    if (r.test(b)) {
      break;
    }
  }
  return found.join(' ')
}

function get_pen_position() {
  let path = get_path();
  let bits = path.getAttributeNS(null, "data-position").split(',');
  return [parseFloat(bits[0]), parseFloat(bits[1])];
}

function get_pen_heading() {
  let path = get_path();
  return rad2deg(parseFloat(path.getAttributeNS(null, 'data-heading')));
}

function set_pen_heading(angle) {
  let path = get_path();
  path.setAttributeNS(null, 'data-heading', cancel_rotations(deg2rad(angle)));
}

function turn_pen(how_far) {
  let angle = get_pen_heading();
  let path = get_path();
  path.setAttributeNS(
    null,
    'data-heading',
    cancel_rotations(deg2rad(angle + how_far))
  );
}

function move_pen_to(to) {
  let path = get_path();
  let data = path.getAttributeNS(null, 'd');
  path.setAttributeNS(null, 'd', data + " M " + to[0] + " " + to[1]);
  path.setAttributeNS(null, 'data-position', '' + to[0] + ',' + to[1]);
  let last = get_pen_position();
  let vec = v_sub(to, last);
  path.setAttributeNS(null, 'data-heading', Math.atan2(vec[1], vec[0]));
}

function move_pen(how_far) {
  let path = get_path();
  let data = path.getAttributeNS(null, 'd');
  let angle = deg2rad(get_pen_heading());
  let x, y;
  if (Array.isArray(how_far)) {
    x = how_far[0];
    y = how_far[1];
  } else {
    x = how_far;
    y = 0;
  }
  let mv = v_add(
    [x * Math.cos(angle), x * Math.sin(angle)],
    [y * -Math.sin(angle), y * Math.cos(angle)]
  );
  path.setAttributeNS(null, 'd', data + " m " + mv[0] + " " + mv[1]);
  let lp = get_pen_position();
  let np = [lp[0] + mv[0], lp[1] + mv[1]];
  path.setAttributeNS(null, 'data-position', '' + np[0] + ',' + np[1]);
  // heading is unaffected
}

function trace_line_to(to) {
  let path = get_path();
  let data = path.getAttributeNS(null, 'd');
  path.setAttributeNS(null, 'd', data + " L " + to[0] + " " + to[1]);
  path.setAttributeNS(null, 'data-position', '' + to[0] + ',' + to[1]);
  let last = get_pen_position();
  let vec = v_sub(to, last);
  path.setAttributeNS(null, 'data-heading', Math.atan2(vec[1], vec[0]));
}

function trace_line(how_far) {
  let path = get_path();
  let data = path.getAttributeNS(null, 'd');
  let angle = deg2rad(get_pen_heading());
  let x, y;
  if (Array.isArray(how_far)) {
    x = how_far[0];
    y = how_far[1];
  } else {
    x = how_far;
    y = 0;
  }
  let mv = v_add(
    [x * Math.cos(angle), x * Math.sin(angle)],
    [y * -Math.sin(angle), y * Math.cos(angle)]
  );
  path.setAttributeNS(null, 'd', data + " l " + mv[0] + " " + mv[1]);
  let lp = get_pen_position();
  let np = [lp[0] + mv[0], lp[1] + mv[1]];
  path.setAttributeNS(null, 'data-position', '' + np[0] + ',' + np[1]);
  // heading is unaffected
}

function trace_curve_to(pos, heading) {
  let path = get_path();
  let angle = deg2rad(get_pen_heading());
  let lp = get_pen_position();
  let rv = v_sub(pos, lp);

  // projected and orthogonal vectors
  let pv = v_proj(rv, [Math.cos(angle), Math.sin(angle)]);
  let ov = v_sub(rv, pv);

  // rotated relative coordinates
  let rc = [v_length(pv), v_length(ov)];

  let rh;
  if (heading != undefined) {
    rh = heading - angle;
  }

  trace_curve(rc, rh);
}

function trace_curve(rel_pos, rel_heading, curve_size) {
  let path = get_path();
  let data = path.getAttributeNS(null, 'd');
  let lp = get_pen_position();
  let angle = deg2rad(get_pen_heading());
  let rv = v_add(
    v_scale([Math.cos(angle), Math.sin(angle)], rel_pos[0]),
    v_scale([-Math.sin(angle), Math.cos(angle)], rel_pos[1])
  );

  // compute control point locations
  if (rel_heading == undefined && curve_size == undefined) {
    if (rel_pos[0] <= 0) {
      // Use separate control points if destination is behind current position
      curve_size = v_length(rel_pos)/2;
      if (curve_size == 0) {
        // no movement -> no curve (heading & curve size not specified)
        return;
      }
      // fall out to compute heading from curve_size
    } else {
      // Direct quadratic curve to our destination
      let rel_angle = deg2rad(v_rotation([1, 0], rel_pos));
      let adj = v_length(rel_pos)/2;
      // cosine(rel_angle) = adj / hyp, so hyp = adj / cos(rel_angle)
      curve_size = adj / Math.cos(rel_angle);
      // control point location
      let cp = v_scale([Math.cos(angle), Math.sin(angle)], curve_size);
      // heading from control point location
      let fhv = v_sub(rv, cp);
      let fa = Math.atan2(fhv[1], fhv[0]);
      rel_heading = rad2deg(fa - angle);
    }
  }

  if (curve_size == undefined) {
    // heading but no curve size
    curve_size = v_length(rel_pos)/2;
    if (curve_size == 0) {
      // no movement -> no curve (heading & curve size not specified)
      return;
    }
  } else if (rel_heading == undefined) {
    // curve_size but no heading
    if (curve_size >= v_length(rel_pos)/2) {
      // set up isosceles triangle with curve_size and rel_pos
      let rel_angle = deg2rad(v_rotation([1, 0], rel_pos));
      let adj = v_length(rel_pos)/2;
      let inner_angle = Math.acos(adj / curve_size);
      // angle necessary to line up first cp with current heading:
      let rot_back = rel_angle - inner_angle;
      // rotate other cp by same amount:
      rel_heading = rad2deg(rel_angle + inner_angle + rot_back - angle);
    } else {
      let rot_back = rel_angle;
      let fr = (curve_size*2) / v_length(rel_pos);
      rel_heading = rad2deg(rel_angle + rot_back * fr - angle);
    }
  }

  // compute control points from curve_size and heading:
  let hrad = deg2rad(rel_heading) + angle;
  let cp1 = v_scale([Math.cos(angle), Math.sin(angle)], curve_size);
  let cp2v = v_scale([Math.cos(hrad), Math.sin(hrad)], -curve_size);
  let cp2 = v_add(rv, cp2v);

  if (v_same(cp1, cp2)) {
    path.setAttributeNS(
      null,
      'd',
      data + " q " + cp1[0] + " " + cp1[1] + ", " + rv[0] + " " + rv[1]
    );
  } else {
    path.setAttributeNS(
      null,
      'd',
      (
        data + " c "
      + cp1[0] + " " + cp1[1] + ", "
      + cp2[0] + " " + cp2[1] + ", "
      + rv[0] + " " + rv[1]
      )
    );
  }
  // final position and angle:
  let fp = v_add(lp, rv);
  path.setAttributeNS(null, 'data-position', fp[0] + ',' + fp[1]);
  path.setAttributeNS(null, 'data-heading', cancel_rotations(hrad));
}


/*----------------------- Additional Documentation ---------------------------*/

/*
# available_scripts
- Categories: style_control text fonts
- See Also: script_styles, set_font, load_font
- Text: The scripts (writing systems) that are available by default are
    Google's Noto family of fonts which aims to have complete Unicode coverage.
    In the list below, they are organized by geographical origin, and then
    alphabetically by English name. Scripts are accessible using both their
    endonym (listed in angle brackets where avialable) and their English name
    (listed in parentheses). Additionally, some scripts are available in
    multiple styles, which are listed under each available script. See
    [script styles](#script_styles) for more information about styles.

    - Western European
        * <Latin> (Latin)
            * serif
            * sans-serif
            * monospaced
            * display
            * (Note: Covers most modern Romance and Germanic languages)
        * <ελληνικά> (Greek)

    - Eastern European
        * <Кириллица> (Cyrillic)
            * serif
            * sans-serif
            * display

    - East Asian
        * <日本語> (Japanese)
        * <简体中文> (Simplified Chinese)
        * <繁體中文> (Traditional Chinese)
        * <廣東話> (Cantonese)
        * <> (Mongolian)

    - Central Asian
        * <> (Armenian)
            * serif
            * sans-serif
        * <> (Georgian)
        * <> (Urdu)

    - Arabian & Levantine
        * <> (Hebrew)
        * <> (Arabic)

    - Southeast Asian
        * <> (Buginese)
        * <> (Cham)
        * <ꦕꦫꦏꦤ꧀> (Javanesee)
        * <ꤊꤢ꤬ꤛꤢ꤭ ꤜꤟꤤ꤬> (Kayah Li)
        * <> (Khmer)
        * <> (Lao)
        * <> (Malayalam)
        * <> (Thai)

    - Oceanian
        * <> (Balinese)
        * <> (Batak)
        * <> (Buhid)
        * <ᜱᜨᜳᜨᜳᜢ> (Hanunoo/Hanunuo)

    - Indian & Sri Lankan
        * <> (Bengali)
        * <> (Chakma)
        * <> (Devangari)
        * <> (Gujarati)
        * <> (Gurmukhi)
        * <> (Kannada)
        * <ᰛᰩᰵ་ᰛᰵᰧᰶ> (Lepcha)
        * <ᤕᤠᤰᤌᤢᤱ ᤐᤠᤣ> (Limbu)
        * <> (Tamil)
        * <> (Telugu)

    - North American
        * <> (Cherokee)
        * <> (Canadian Aboriginal)
        * <> (Osage)

    - South American

    - North African
        * <> (Coptic)
        * <> (Ethiopic)

    - Central African
        * <> (Adlam)
        * <> (Bamum)

    - South African
       
    - Historical
        * <> (Anatolian Hieroglyphs)
        * <> (Avestan)
        * <> (Brahmi)
        * <> (Carian)
        * <> (Cuneiform)
        * <> (Cypriot)
        * <> (Deseret)
        * <> (Egyptian Hieroglyphs)
        * <> (Glagolitic)
        * <> (Gothic)
        * <> (Imperial Aramaic)
        * <> (Inscriptional Pahlavi)
        * <> (Inscriptional Parthian)
        * 𑂍𑂶𑂟𑂲 (Kaithi)
        * <> (Kharoshthi)
        * <> (Linear B)

    #####
        * <> (Lisu)
        * <> (Lycian)
        * <> (Lydian)
        * <> (Mandaic)
        * <> (Meetei Mayek)
        * <> (Myanmar)
        * <> (NKo)
        * <> (New Tai Lue)
        * <> (Ogham)
        * <> (Ol Chiki)
        * <> (Old Italic)
        * <> (Old Persian)
        * <> (Old South Arabian)
        * <> (Old Turkic)
        * <> (Oriya)
        * <> (Osmanya)
        * <> (Phags Pa)
        * <> (Phoenician)
        * <> (Rejang)
        * <> (Runic)
        * <> (Samaritan)
        * <> (Saurashtra)
        * <> (Shavian)
        * <> (Sinhala)
        * <> (Sudanese)
        * <> (Syloti Nagri)
        * <> (Symbols)
        * <> (Symbols2)
        * <> (Syriac Eastern)
        * <> (Syriac Estrangela)
        * <> (Syriac Western)
        * <> (Tagalog)
        * <> (Tagbanwa)
        * <> (Tai Le)
        * <> (Tai Tham)
        * <> (Tai Viet)
        * <> (Thaana)
        * <> (Tibetan)
        * <> (Tifinagh)
        * <> (Ugaritic)
        * <> (Vai)
        * <> (Yi)

  # Serif
        * Armenian
        * Bengali
        * CJK (JP/KR/SC/TC)
        * Devangari
        * Ethiopic
        * Georgian
        * Gujarati
        * Hebrew
        * Kannada
        * Khmer
        * Lao
        * Malayalam
        * Myanmar
        * Sinhala
        * Tamil
        * Telugu
        * Thai
*/

/*
# script_styles
- Categories: style_control text fonts
- See Also: available_scripts, set_font, load_font
- Text: Many avaialble writing systems (scripts) also include multiple styles,
    such as serif, sans-serif, or monospaced. The styles are listed along with
    each script in the [available scripts](#available_scripts) list. The
    general terminology of various styles includes:

    - serif: A serif style inclues small marks at the ends of glyph strokes
      called serifs that help differentiate the characters, making text easier
      to read at larger font sizes for experienced readers. However, serifs
      make text harder to read at small sizes and for children and many
      dyslexic readers. These styles are more similar to ancient calligraphic
      styles, and are usually used for blocks of lots of text. The default
      style for most scripts is a serif style, but the default font size is
      also fairly large.

    - sans-serif: A sans-serif (literally "without serif") style is simpler and
      does not include extra marks at stroke ends. Sans-serif styles are often
      easier to read for those just learning to read and for people with
      dyslexia. Sans-serif styles are also often used for short or isolated
      bits of text, like titles or captions. Sans-serif styles are usually more
      legible than serif styles at small font sizes.

    - display: A fancier version of a font that's intended for use in titles or
      signs. Not intended to be used for body text or extended reading.
*/
