<?php
// DELETE /delete_contact.php?id=5
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/ContactService.php';

if ($_SERVER['REQUEST_METHOD'] !== 'DELETE') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed, use DELETE']);
    exit;
}

if (!isset($_GET['id']) || !ctype_digit($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'A valid numeric id parameter is required']);
    exit;
}

$id = (int) $_GET['id'];
$deleted = deleteContact($pdo, $id);

if (!$deleted) {
    http_response_code(404);
    echo json_encode(['error' => 'Contact not found']);
    exit;
}

echo json_encode(['message' => 'Contact deleted']);
