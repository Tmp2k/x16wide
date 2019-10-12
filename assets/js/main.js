const shortUrl = 'https://x16.io';
const emuVer = 'r33';

// DOM elements
const statusElement = $('#status');
const progressElement = $('#progress');
const spinnerElement = $('#spinner');
const output = $('#output');
const canvas = $('#canvas');
const code = $('#code');

//Emscripten module
var Module;


//detecting keyboard layout...

//define valid layouts (this can be gotten by running the emulator with -keymap)
const layouts = [
    'en-us',
    'en-gb',
    'de',
    'nordic',
    'it',
    'pl',
    'hu',
    'es',
    'fr',
    'de-ch',
    'fr-be',
    'pt-br'
];

lang = getFirstBrowserLanguage().toLowerCase().trim();

if(layouts.includes(lang)) {
    logOutput('Using keyboard map: ' + lang);
} else {
    logOutput('Language ('+lang+') not found in keymaps so using keyboard map: en-us');
    lang = 'en-us';
}


//error logging
window.onerror = function() {
    Module.setStatus('Exception thrown, see JavaScript console');
    // hide loader
    flyAway();
    //todo - show static  https://codepen.io/alenaksu/pen/dGjeMZ


    Module.setStatus = function(text) {
        if (text) Module.printErr('text');
    };
};



$(function() {

    $('#code').change(function(){
        const selectionStart = $(this).prop('selectionStart');
        const selectionEnd = $(this).prop('selectionEnd');

        this.value = ascii2pfont(this.value);
        $(this).prop('selectionStart',selectionStart).prop('selectionEnd',selectionEnd);

        $('#shareCode').show();
        $('#x16url').hide();
        $('#copy-url').hide();

        if(this.value.length > 0) {
            $('#shareCode').prop('disabled','');
        } else {
            $('#shareCode').prop('disabled',true);
        }

    });

    $('#code').keyup(function(){
        $(this).change();
    });

    //run this anyway on page load
    $('#code').change();


    //if share ID included in address then load it
    const matches = window.location.href.match(/^https?:\/\/[^\/]+\/([a-z]+)/i);

    if(matches !== null) {
        $.get('/api/share/'+matches[1], function( data ) {
            $('#code').val(data);
            $('#x16url').val(shortUrl+'/'+matches[1]);
            $('#shareCode').hide();
            $('#x16url').show();
            $('#copy-url').show();
        }).fail(function() {
            const rootUrl = window.location.href.split('/').slice(0,-1).join('/');
            window.location.href = rootUrl;
        });
    } else {
        $('#shareCode').show();
        $('#x16url').hide();
        $('#copy-url').hide();
    }


    //startup logo/anim
    //$('#canvas').css('opacity',0);

    setTimeout(function(){
        $('.butterfly-container').css('opacity',1);
    },500);

    //launch emulator
    launchEmulator(emuVer);

});


function haltEmulator() {
    $('.js-emu').remove();
    Module = null;
    canvas.fadeOut();
}

function launchEmulator(version) {

    haltEmulator();

    Module = {
        locateFile: function(s) { //this sets the location of the wasm file to run relative to document root
            return 'library/x16-emulator/'+version+'/' + s;
        },
        preRun: [
            function() {         //Set the keyboard handling element (it's document by default). Keystrokes are stopped from propagating by emscripten, maybe there's an option to disable this?
                ENV.SDL_EMSCRIPTEN_KEYBOARD_ELEMENT = "#canvas";

            }
        ],
        postRun: [
            function () {
                flyAway();
                canvas.fadeIn();

            }
        ],
        arguments: [    //set key map to user's lang
            '-keymap',lang
        ],
        print: (function() {

            if (output) output.value = ''; // clear browser cache
            return function(text) {
                if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');
                logOutput(text);
            };
        })(),
        printErr: function(text) {
            if (arguments.length > 1) text = Array.prototype.slice.call(arguments).join(' ');

            logOutput("[error] " + text);


        },
        canvas: (function() {

            // As a default initial behavior, pop up an alert when webgl context is lost. To make your
            // application robust, you may want to override this behavior before shipping!
            // See http://www.khronos.org/registry/webgl/specs/latest/1.0/#5.15.2
            document.getElementById('canvas').addEventListener("webglcontextlost", function(e) {
                alert('WebGL context lost. You will need to reload the page.');
                e.preventDefault();
            }, false);
            return document.getElementById('canvas');
        })(),
        setStatus: function(text) {
            logOutput(text);
            if (!Module.setStatus.last) Module.setStatus.last = {
                time: Date.now(),
                text: ''
            };
            if (text === Module.setStatus.last.text) return;
            const m = text.match(/([^(]+)\((\d+(\.\d+)?)\/(\d+)\)/);
            let now = Date.now();
            if (m && now - Module.setStatus.last.time < 30) return; // if this is a progress update, skip it if too soon
            Module.setStatus.last.time = now;
            Module.setStatus.last.text = text;
            if (m) {

                const percent = parseInt(m[2]/m[4]) * 100;
                //alert(m);
                $('.butterfly .prog').css('height',percent +'%');
                text = m[1];
                //show loader
            } else {
                //hide
                if (!text) $('.butterfly').addClass('flying');
            }
            statusElement.innerHTML = text;
            logOutput(text);
        },
        totalDependencies: 0,
        monitorRunDependencies: function(left) {
            this.totalDependencies = Math.max(this.totalDependencies, left);
            Module.setStatus(left ? 'Preparing... (' + (this.totalDependencies - left) + '/' + this.totalDependencies + ')' : 'All downloads complete.');
        }
    };

    Module.setStatus('Downloading file...');
    logOutput('Downloading file...');

    $('<script class="js-emu" type="text/javascript" src="/library/x16-emulator/'+version+'/x16emu.js"></script>').appendTo('body');

}

function copyUrl() {

    /* Select the text field */
    $('#x16url').focus().select();

    /* Copy the text inside the text field */
    document.execCommand("copy");
    //TODO growl "copied to clipboard"
}

function shareCode() {
    $.post('/api/share', { code: $('#code').val() })
        .done(function( data ) {
            const rootUrl = window.location.href.split('/').slice(0,-1).join('/');
            $('#x16url').val(shortUrl +'/'+ data).show();
            $('#copy-url').show();
            $('#shareCode').hide();
            copyUrl();

            history.pushState({},"Share your code",rootUrl +'/'+ data);
        });

}

function ascii2pfont(text) {
    text = text.toUpperCase();
    return text
}

function pfont2ascii(text) {

    let output = '';

    for (const c of text) {

        if(c.charCodeAt(0) < 0x60) output+= c;
        if(c.charCodeAt(0) >= 0x0ee40 && c.charCodeAt(0) < 0x0ee60) output+= '\\X'+(c.charCodeAt(0)-0x0ede0).toString(16);
        if(c.charCodeAt(0) >= 0x0ee60 && c.charCodeAt(0) < 0x0ee80) output+= '\\X'+(c.charCodeAt(0)-0x0edc0).toString(16);

    }

    return output;
}

function runCode() {

    //launchEmulator(emuVer);
    Module.ccall("j2c_paste", "void", ["string"], ['\nNEW\n'+ pfont2ascii(code.val()) + '\nRUN\n']);
    canvas.focus();

}

function flyAway() {
    $('.butterfly').addClass('flying');
    setTimeout(function(){
        $('.butterfly').hide();
        $('#canvas').css('opacity','').focus();
    },200);
}




function resetEmulator() {
    j2c_reset = Module.cwrap("j2c_reset", "void", []);
    j2c_reset();
    canvas.focus();
}



function closeFs(){
    canvas.parent().classList.remove("fullscreen");
    canvas.focus();
}

function openFs(){
    canvas.parent().classList.add("fullscreen");
    canvas.focus();
}

function logOutput(text) {
    if (output) {
        output.innerHTML += text + "\n";
        output.parent().parent().scrollTop = output.parent().parent().scrollHeight; // TODO - also need to do this when changing back to teh console tab

    }
    console.log(text);
}


function getFirstBrowserLanguage() {
    const nav = window.navigator,
        browserLanguagePropertyKeys = ['language', 'browserLanguage', 'systemLanguage', 'userLanguage'];
    let i,
        language;

    // support for HTML 5.1 "navigator.languages"
    if (Array.isArray(nav.languages)) {
        for (i = 0; i < nav.languages.length; i++) {
            language = nav.languages[i];
            if (language && language.length) {
                return language;
            }
        }
    }

    // support for other well known properties in browsers
    for (i = 0; i < browserLanguagePropertyKeys.length; i++) {
        language = nav[browserLanguagePropertyKeys[i]];
        if (language && language.length) {
            return language;
        }
    }

    return null;
}

