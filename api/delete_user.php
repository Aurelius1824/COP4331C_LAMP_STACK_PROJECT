<?php
// DELETE /delete_user.php?id=5
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/UserService.php';

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

try {
    $deleted = deleteUser($pdo, $id);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not delete user']);
    exit;
}

if (!$deleted) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

echo json_encode(['message' => 'User and their contacts deleted']);
