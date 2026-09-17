<?php
// PUT /update_user.php?id=5
// Body (JSON, all fields optional — only send what you want to change):
// { "firstName": "...", "lastName": "...", "username": "...", "password": "..." }
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';
require_once __DIR__ . '/UserService.php';

if ($_SERVER['REQUEST_METHOD'] !== 'PUT') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed, use PUT']);
    exit;
}

if (!isset($_GET['id']) || !ctype_digit($_GET['id'])) {
    http_response_code(400);
    echo json_encode(['error' => 'A valid numeric id parameter is required']);
    exit;
}

$id = (int) $_GET['id'];
$input = json_decode(file_get_contents('php://input'), true);

if (!is_array($input) || empty($input)) {
    http_response_code(400);
    echo json_encode(['error' => 'Request body must contain at least one field to update']);
    exit;
}

$allowedFields = ['firstName', 'lastName', 'username', 'password'];
$fields = array_intersect_key($input, array_flip($allowedFields));

if (empty($fields)) {
    http_response_code(400);
    echo json_encode(['error' => 'No valid fields to update. Allowed: ' . implode(', ', $allowedFields)]);
    exit;
}

if (isset($fields['password']) && strlen($fields['password']) < 8) {
    http_response_code(400);
    echo json_encode(['error' => 'Password must be at least 8 characters']);
    exit;
}

try {
    $updated = updateUser($pdo, $id, $fields);
} catch (RuntimeException $e) {
    http_response_code(409);
    echo json_encode(['error' => $e->getMessage()]);
    exit;
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Could not update user']);
    exit;
}

if (!$updated) {
    http_response_code(404);
    echo json_encode(['error' => 'User not found']);
    exit;
}

echo json_encode(['message' => 'User updated']);
