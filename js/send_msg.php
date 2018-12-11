<?php

$first_name    =    $_POST['Fname'];
$last_name     =    $_POST['Lname'];
$email         =    $_POST['email'];
$subject       =    $_POST['sub'];
$txt           =    $_POST['message'];

$return = array();

$return['error'] = false;

if(preg_match("/([\w\-]+\@[\w\-]+\.[\w\-]+)/", $email)){

	$to = "info@4s-systems.com";
	$headers = "From:$email" . "\r\n" ."CC: ";

	if(mail($to,$subject,$txt,$headers)){
		$message = "Your Message Sent Successfully";}

	else {
		$message = "Something Went Wrong with your Message .Try Again";}

        $return['msg'] = $message;}


else {
    $return['error'] = true;
    $return['msg'] .= 'Please Write your Email Correctly';}


echo json_encode($return);
exit;
?>
