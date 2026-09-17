<?php
// GET /get_contact.php?id=5
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ContactService.php';

if (!isset($_GET['id']) || !ctype_digit($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'A valid numeric id parameter is required']);
    exit;
}

$id = (int) $_GET['id'];
$contact = getContactById($pdo, $id);

if ($contact === null) {
    http_response_code(404);
    echo json_encode(['error' => 'Contact not found']);
    exit;
}

echo json_encode($contact);
