<?php
// POST /create_contact.php
// Body (JSON): { "firstName": "...", "lastName": "...", "emailAddress": "...", "phoneNumber": "...", "userId": 1 }
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ContactService.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed, use POST']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

$required = ['firstName', 'lastName', 'emailAddress', 'phoneNumber', 'userId'];
foreach ($required as $field) {
    if (empty($input[$field]) && $input[$field] !== 0) {
        http_response_code(400);
        echo json_encode(['error' => "Missing required field: $field"]);
        exit;
    }
}

if (!filter_var($input['emailAddress'], FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email address']);
    exit;
}

try {
    $newId = createContact(
        $pdo,
        $input['firstName'],
        $input['lastName'],
        $input['emailAddress'],
        $input['phoneNumber'],
        (int) $input['userId']
    );
    http_response_code(201);
    echo json_encode(['id' => $newId, 'message' => 'Contact created']);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not create contact']);
}
