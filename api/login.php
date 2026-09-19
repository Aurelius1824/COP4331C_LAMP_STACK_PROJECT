<?php
// POST /login.php
// Body (JSON): { "username": "...", "password": "..." }
header('Content-Type: application/json');

require_once __DIR__ . '/db.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed, use POST']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (empty($input['username']) || empty($input['password'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Username and password are required']);
    exit;
}

try {
    $stmt = $pdo->prepare(
        'SELECT ID, FirstName, LastName, Username, Password
         FROM Users WHERE Username = :username LIMIT 1'
    );
    $stmt->execute(['username' => $input['username']]);
    $user = $stmt->fetch();

    if ($user && password_verify($input['password'], $user['Password'])) {
        http_response_code(200);
        echo json_encode([
            'id'        => (int) $user['ID'],
            'firstName' => $user['FirstName'],
            'lastName'  => $user['LastName'],
            'username'  => $user['Username'],
            'error'     => ''
        ]);
    } else {
        http_response_code(401);
        echo json_encode([
            'id' => 0, 'firstName' => '', 'lastName' => '',
            'error' => 'Invalid username or password'
        ]);
    }
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Login failed']);
}
