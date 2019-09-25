<?php

/******************************************************************************
 *
 *   This is just a temporary measure, to allow people to share code.
 *
 *   This should really be handled via an API such as pastebin pro, or put into a DB
 *
 *   The next step is to add a framework, probably symphony, to handle this.
 *   Or should that be it's own project?
 *
 */

$file_limit = 100;  //max files per minute limit

if(empty($_POST) && !empty($_GET['id'])) {
    //sanitise id
    $id = preg_replace("/[^A-Za-z]/", '', $_GET['id']);

    $fn = '../../shared-code/'.$id;

    if(file_exists($fn)) {
        header('Content-type: text/plain');
        echo file_get_contents($fn);
    } else {
        http_response_code(404);
        echo 404;
    }

} elseif (!empty($_POST['code'])) {
    //TODO check for file throttle

    //generate id
    do {
        $id = generateRandomString();
        $fn = '../../shared-code/'.$id;
    } while (file_exists($fn));

    file_put_contents($fn,$_POST['code']);

    echo $id;

} else {
    http_response_code(403);
    echo 403;
}





function generateRandomString($length = 7) {
    $characters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    $charactersLength = strlen($characters);
    $randomString = '';
    for ($i = 0; $i < $length; $i++) {
        $randomString .= $characters[rand(0, $charactersLength - 1)];
    }
    return $randomString;
}

