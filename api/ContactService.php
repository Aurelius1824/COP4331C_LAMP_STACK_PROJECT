<?php
// ContactService.php — retrieval, creation, and deletion for the Contacts table

require_once __DIR__ . '/db.php';

/**
 * Get a single contact by its ID.
 * Returns an associative array, or null if not found.
 */
function getContactById(PDO $pdo, int $id): ?array {
    $stmt = $pdo->prepare(
        'SELECT ID, FirstName, LastName, EmailAddress, PhoneNumber, DateCreated, DateUpdated, UserID
         FROM Contacts
         WHERE ID = :id'
    );
    $stmt->execute(['id' => $id]);
    $result = $stmt->fetch();
    return $result ?: null;
}

/**
 * Get all contacts belonging to a specific user.
 * Returns an array of associative arrays (empty array if none found).
 */
function getContactsByUserId(PDO $pdo, int $userId): array {
    $stmt = $pdo->prepare(
        'SELECT ID, FirstName, LastName, EmailAddress, PhoneNumber, DateCreated, DateUpdated, UserID
         FROM Contacts
         WHERE UserID = :userId'
    );
    $stmt->execute(['userId' => $userId]);
    return $stmt->fetchAll();
}

/**
 * Create a new contact. DateCreated/DateUpdated are set to today automatically.
 * Returns the newly created contact's ID.
 */
function createContact(
    PDO $pdo,
    string $firstName,
    string $lastName,
    string $emailAddress,
    string $phoneNumber,
    int $userId
): int {
    $stmt = $pdo->prepare(
        'INSERT INTO Contacts (FirstName, LastName, EmailAddress, PhoneNumber, DateCreated, DateUpdated, UserID)
         VALUES (:firstName, :lastName, :emailAddress, :phoneNumber, CURDATE(), CURDATE(), :userId)'
    );
    $stmt->execute([
        'firstName'    => $firstName,
        'lastName'     => $lastName,
        'emailAddress' => $emailAddress,
        'phoneNumber'  => $phoneNumber,
        'userId'       => $userId,
    ]);
    return (int) $pdo->lastInsertId();
}

/**
 * Update an existing contact. Only the fields present in $fields are changed
 * (partial update) — allowed keys: firstName, lastName, emailAddress,
 * phoneNumber, userId. DateUpdated is always bumped to today.
 * Returns true if the contact exists and was updated, false if no matching
 * contact existed (in which case nothing is written).
 */
function updateContact(PDO $pdo, int $id, array $fields): bool {
    if (getContactById($pdo, $id) === null) {
        return false;
    }
 
    $columnMap = [
        'firstName'    => 'FirstName',
        'lastName'     => 'LastName',
        'emailAddress' => 'EmailAddress',
        'phoneNumber'  => 'PhoneNumber',
        'userId'       => 'UserID',
    ];
 
    $setParts = [];
    $params = ['id' => $id];
    foreach ($columnMap as $key => $column) {
        if (array_key_exists($key, $fields)) {
            $setParts[] = "$column = :$key";
            $params[$key] = $fields[$key];
        }
    }
 
    if (empty($setParts)) {
        return true; // nothing to update, but the contact does exist
    }
 
    $setParts[] = 'DateUpdated = CURDATE()';
    $sql = 'UPDATE Contacts SET ' . implode(', ', $setParts) . ' WHERE ID = :id';
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return true;
}
 


/**
 * Delete a contact by ID.
 * Returns true if a row was deleted, false if no matching contact existed.
 */
function deleteContact(PDO $pdo, int $id): bool {
    $stmt = $pdo->prepare('DELETE FROM Contacts WHERE ID = :id');
    $stmt->execute(['id' => $id]);
    return $stmt->rowCount() > 0;
}
