<?php
// POST /create_contact.php
// Body (JSON): { "firstName": "...", "lastName": "...", "nickName": "...", "emailAddress": "...", "phoneNumber": "...", "userId": 1 }
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ContactService.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed, use POST']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Request body must be valid JSON']);
    exit;
}

function clean($v) {
    $v = trim((string) ($v ?? ''));
    return $v === '' ? null : $v;   // store empty as NULL
}

$first = clean($input['firstName'] ?? null);
$last  = clean($input['lastName'] ?? null);
$nick  = clean($input['nickName'] ?? $input['NickName'] ?? $input['nickname'] ?? null);
$email = clean($input['emailAddress'] ?? null);
$phone = clean($input['phoneNumber'] ?? null);

if (!isset($input['userId']) || !ctype_digit((string) $input['userId'])) {
    http_response_code(400);
    echo json_encode(['error' => 'A valid userId is required']);
    exit;
}

if ($first === null && $last === null && $nick === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Provide a first name, a last name, or a nickname']);
    exit;
}

if ($email === null && $phone === null) {
    http_response_code(400);
    echo json_encode(['error' => 'Provide an email address or a phone number']);
    exit;
}

if ($email !== null && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email address']);
    exit;
}

try {
    $newId = createContact($pdo, $first, $last, $nick, $email, $phone, (int) $input['userId']);
    http_response_code(201);
    echo json_encode(['id' => $newId, 'message' => 'Contact created']);
} catch (PDOException $e) {
    error_log('createContact failed: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['error' => 'Could not create contact']);
}
