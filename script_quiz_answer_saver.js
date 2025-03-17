// ==UserScript==
// @name         TuQS by Jakin
// @version      0.2
// @description  Script to save questions answered
// @copyright    2025 Jakob Kinne, GPLv3 License
// @require      http://ajax.googleapis.com/ajax/libs/jquery/3.7.1/jquery.min.js
// @require      https://raw.githubusercontent.com/blueimp/JavaScript-MD5/refs/heads/master/js/md5.min.js
// @match        https://tuwel.tuwien.ac.at/mod/quiz/view.php*
// @match        https://tuwel.tuwien.ac.at/mod/quiz/attempt.php*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tuwel.tuwien.ac.at
// @updateURL    https://raw.githubusercontent.com/Jakin687/tuwel-quiz-answer-saver/refs/heads/main/script_quiz_answer_saver.js
// @downloadURL  https://raw.githubusercontent.com/Jakin687/tuwel-quiz-answer-saver/refs/heads/main/script_quiz_answer_saver.js
// ==/UserScript==


const LOCAL_STORAGE_KEY = "TASKey";

const STATES = {
    viewQuiz: "viewQuiz",
    answerQuiz : "answerQuiz"
};

const HREF = new URL(window.location.toString());
const STATE = (HREF.pathname.includes("view.php")) ? STATES.viewQuiz : STATES.answerQuiz;

const QUESTION_TYPES = {
    multiplechoice: "multichoice",
    multiplechoiceset: "multichoiceset",
    select: "match",
    multianswer: "multianswer",
    dragndropimage: "ddimageortext",
    dragndroptext: "ddwtos",
    shortanswer: "shortanswer",
    truefalse: "truefalse"
};

const AVAILABLE_TYPES = [
    QUESTION_TYPES.truefalse,
    QUESTION_TYPES.multiplechoice,
];

let storage = getQuizStorage();
let quiz_hash = md5($(".page-header-headings > h1").text());
let question_hash = getQuestionHash();
let question_type = getQuestionType();
let question_data = getQuestionData();


function saveStorage()
{
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storage));
}

function getQuizStorage()
{
    let storage = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));
    return (storage === null) ? {} : storage;
}

function clearQuiz()
{
    let storage = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY));

    if (storage === null) {
        return;
    }

    delete storage[quiz_hash];

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(storage));
}

function globalClearQuiz()
{
    localStorage.removeItem(LOCAL_STORAGE_KEY);
}

function getQuestionType()
{
    let question = $(".que");

    for (const type of Object.values(QUESTION_TYPES))
    {
        if (question.hasClass(type))
        {
            return type;
        }
    }
}

function isQuestionAnswerable()
{
    return AVAILABLE_TYPES.includes(question_type);
}

function getQuestionData()
{
    if(storage[quiz_hash] === undefined) return undefined;
    return storage[quiz_hash][question_hash];
}

function getQuestionHash()
{
    let que = $(".qtext");
    let img = que.find("img");
    let qText = que.text();

    if (img.length != 0)
    {
        qText += img.attr('src');
    }

    return md5(qText);
}

function getQuizData()
{
    if (storage[quiz_hash] === undefined) return {};
    return storage[quiz_hash];
}

function addSaveAndNextBtn(controller)
{
    let btn = document.createElement("div");
    btn.classList.add("btn");
    btn.classList.add("btn-primary");
    btn.style.marginLeft = "10px";
    btn.innerHTML = "Save and next";
    window.tas_controller = controller;

    $("#mod_quiz-next-nav").parent().append(btn);

    btn.onclick = () => {
        window.tas_controller.save();
        let quiz = getQuizData();

        quiz[question_hash] = question_data;
        storage[quiz_hash] = quiz;
        
        saveStorage();
        
        $("#mod_quiz-next-nav").click();
    };
}

function addClearQuizBtn()
{
    let row = $(".quizstartbuttondiv").parent();

    let btn = document.createElement("div");
    btn.classList.add("btn");
    btn.classList.add("btn-primary");
    btn.style.marginLeft = "10px";
    btn.innerHTML = "Remove Quiz Data";

    row.append(btn);

    btn.onclick = () => {
        if (window.confirm("Are you sure?"))
        {
            clearQuiz();
        }
    };
}

function addLoadQuizBtn()
{
    let row = $(".quizstartbuttondiv").parent();

    let btn = document.createElement("div");
    btn.classList.add("btn");
    btn.classList.add("btn-primary");
    btn.style.marginLeft = "10px";
    btn.innerHTML = "Import Quiz Data";

    row.append(btn);

    btn.onclick = () => {
        let json = window.prompt("Enter Quiz Json", '');

        if (json === null)
        {
            return;
        }

        if (storage[quiz_hash] !== undefined)
        {
            if (!window.confirm("You are about to overwrite existing data?"))
            {
                return;
            }
        }

        storage[quiz_hash] = JSON.parse(json);

        saveStorage();
    };
}

function addCopyQuizBtn()
{
    let row = $(".quizstartbuttondiv").parent();

    let btn = document.createElement("div");
    btn.classList.add("btn");
    btn.classList.add("btn-primary");
    btn.style.marginLeft = "10px";
    btn.innerHTML = "Copy Quiz";

    row.append(btn);

    btn.onclick = () => {
        if (storage[quiz_hash] !== undefined)
        {
            navigator.clipboard.writeText(JSON.stringify(storage[quiz_hash]));
        }
    };
}

class truefalse
{
    constructor () {
        this.answerElements = $(".answer").children();
        if (question_data === undefined)
        {
            question_data = [];
        }
    }

    answer() {
        this.answerElements.each(function () {
            let h = md5($(this).children().last().text());
            if (question_data.includes(h))
            {
                $(this).children().first().prop("checked", true);
            }
        });
    }

    save() {
        question_data = [];
        this.answerElements.each(function () {
            if ($(this).children().first().is(":checked"))
            {
                question_data.push(md5($(this).children().last().text()));
            }
        });
    }
}

class multichoice
{
    constructor () {
        this.answerElements = $(".answer").children();
        if (question_data === undefined)
        {
            question_data = [];
        }
    }

    answer() {
        console.log(question_hash);
        
        this.answerElements.each(function () {
            let h = md5($(this).children().last().children().last().text());
            
            if (question_data.includes(h))
            {   
                let box = $(this).find("input[type='radio']");
                if (box.length == 0)
                {
                    box = $(this).find("input[type='checkbox']");
                }
                box.prop("checked", true);
            }
        });
    }

    save() {
        question_data = [];
        this.answerElements.each(function () {
            let box = $(this).find("input[type='radio']");
            
            if (box.length == 0)
            {
                box = $(this).find("input[type='checkbox']");
            }

            if (box.is(":checked"))
            {
                question_data.push(md5($(this).children().last().children().last().text()));
            }
        });
    }
}


(function () {
    if (STATE == STATES.viewQuiz)
    {
        addCopyQuizBtn();
        addClearQuizBtn();
        addLoadQuizBtn();
        return;
    }

    if (!isQuestionAnswerable())
    {
        return;
    }

    let controller = eval(`new ${question_type}()`);
    controller.answer();

    addSaveAndNextBtn(controller);
})();
