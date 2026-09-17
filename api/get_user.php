<?php
// GET /get_user.php?id=5
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/UserService.php';

if (!isset($_GET['id']) || !ctype_digit($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'A valid numeric id parameter is required']);
    exit;
}

$id = (int) $_GET['id'];
$user = getUserById($pdo, $id);

if ($user === null) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

echo json_encode($user);
