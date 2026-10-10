<?php
/**
 * Alfa Triton — quote / enquiry handler.
 * Runs on standard cPanel PHP hosting (PHP 7.4+). Sends the enquiry with
 * attachments via mail(). For best deliverability configure SMTP/SPF/DKIM
 * on the domain, or swap mail() for PHPMailer + SMTP.
 *
 * Spam layers: honeypot field, minimum fill time, per-IP rate limit,
 * link-count heuristic, optional Cloudflare Turnstile.
 */

// ---- Config [Need update from Oliver / hosting] ---------------------------
const TO_EMAIL         = 'sales@alfatriton.com';          // where enquiries go
const FROM_EMAIL       = 'website@alfatriton.com.au';     // must be a domain mailbox
const TURNSTILE_SECRET = '';                              // Cloudflare Turnstile secret key
const MAX_FILES        = 5;
const MAX_FILE_BYTES   = 10 * 1024 * 1024;
const ALLOWED_EXT      = ['pdf','dwg','dxf','step','stp','igs','iges','jpg','jpeg','png','heic','webp'];
const MIN_FILL_SECONDS = 4;
const RATE_LIMIT       = 5;   // submissions per IP per hour
// ---------------------------------------------------------------------------

$wantsJson = stripos($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json') !== false;

function respond(bool $ok, string $error = '', int $code = 200): void {
    global $wantsJson;
    if ($wantsJson) {
        http_response_code($ok ? 200 : $code);
        header('Content-Type: application/json');
        echo json_encode(['ok' => $ok, 'error' => $error]);
    } elseif ($ok) {
        header('Location: /thank-you/', true, 303);
    } else {
        http_response_code($code);
        echo '<p>' . htmlspecialchars($error) . ' Please call 02 9642 2899.</p><p><a href="/#quote">Back</a></p>';
    }
    exit;
}
function clean(string $key, int $max = 200): string {
    $v = trim((string)($_POST[$key] ?? ''));
    $v = str_replace(["\r", "\n", "%0a", "%0d"], ' ', $v); // header-injection safe
    return mb_substr($v, 0, $max);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') respond(false, 'Method not allowed.', 405);

// 1. Honeypot — real people never see this field. Pretend success to bots.
if (!empty($_POST['website'])) respond(true);

// 2. Time trap — bots submit instantly.
$ts = (int)($_POST['ts'] ?? 0);
if ($ts > 0 && (time() - intdiv($ts, 1000)) < MIN_FILL_SECONDS) respond(true);

// 3. Rate limit per IP.
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rlFile = sys_get_temp_dir() . '/at_rl_' . md5($ip);
$hits = array_filter(explode(',', @file_get_contents($rlFile) ?: ''), fn($t) => (int)$t > time() - 3600);
if (count($hits) >= RATE_LIMIT) respond(false, 'Too many submissions — please call us instead.', 429);
$hits[] = time();
@file_put_contents($rlFile, implode(',', $hits));

// 4. Cloudflare Turnstile (when configured).
if (TURNSTILE_SECRET !== '') {
    $token = $_POST['cf-turnstile-response'] ?? '';
    $ctx = stream_context_create(['http' => [
        'method' => 'POST',
        'header' => 'Content-Type: application/x-www-form-urlencoded',
        'content' => http_build_query(['secret' => TURNSTILE_SECRET, 'response' => $token, 'remoteip' => $ip]),
        'timeout' => 8,
    ]]);
    $verify = json_decode(@file_get_contents('https://challenges.cloudflare.com/turnstile/v0/siteverify', false, $ctx) ?: '{}', true);
    if (empty($verify['success'])) respond(false, 'Spam check failed — please try again.', 400);
}

// 5. Validate fields.
$data = [
    'Service'    => clean('service'),
    'Urgency'    => clean('urgency'),
    'Industry'   => clean('industry'),
    'Site visit' => clean('site_visit') === 'yes' ? 'Yes — please arrange' : 'No',
    'Name'       => clean('name', 120),
    'Company'    => clean('company', 160),
    'Phone'      => clean('phone', 40),
    'Email'      => clean('email', 160),
    'Location'   => clean('location', 120),
    'Source'     => clean('source', 80),
];
$message = mb_substr(trim((string)($_POST['message'] ?? '')), 0, 5000);

if ($data['Name'] === '' || $data['Phone'] === '' || mb_strlen($message) < 10) respond(false, 'Please complete the required fields.', 422);
if (!filter_var($data['Email'], FILTER_VALIDATE_EMAIL)) respond(false, 'Please enter a valid email address.', 422);
if (preg_match_all('#https?://#i', $message) > 2) respond(false, 'Please remove links from your message.', 422);

// 6. Attachments.
$attachments = [];
if (!empty($_FILES['files']) && is_array($_FILES['files']['name'])) {
    $count = 0;
    $finfo = function_exists('finfo_open') ? finfo_open(FILEINFO_MIME_TYPE) : null;
    foreach ($_FILES['files']['name'] as $i => $name) {
        if ($_FILES['files']['error'][$i] === UPLOAD_ERR_NO_FILE) continue;
        if ($_FILES['files']['error'][$i] !== UPLOAD_ERR_OK) respond(false, 'A file failed to upload.', 400);
        if (++$count > MAX_FILES) respond(false, 'Please attach up to ' . MAX_FILES . ' files.', 413);
        if ($_FILES['files']['size'][$i] > MAX_FILE_BYTES) respond(false, 'Each file must be under 10 MB.', 413);
        $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
        if (!in_array($ext, ALLOWED_EXT, true)) respond(false, 'File type not allowed: .' . $ext, 415);
        $tmp = $_FILES['files']['tmp_name'][$i];
        if (!is_uploaded_file($tmp)) continue;
        $mime = $finfo ? (finfo_file($finfo, $tmp) ?: 'application/octet-stream') : 'application/octet-stream';
        if (preg_match('#(php|x-sh|x-executable|javascript|html)#i', $mime)) respond(false, 'File type not allowed.', 415);
        $safe = preg_replace('/[^A-Za-z0-9._-]/', '_', basename($name));
        $attachments[] = ['name' => $safe, 'mime' => $mime, 'data' => file_get_contents($tmp)];
    }
}

// 7. Build and send the email.
$urgent = stripos($data['Urgency'], 'urgent') !== false || stripos($data['Service'], 'breakdown') !== false;
$subject = ($urgent ? '[URGENT] ' : '') . 'Website enquiry: ' . ($data['Service'] ?: 'General') . ' — ' . $data['Name'];
$body = "New enquiry from alfatriton.com.au\n\n";
foreach ($data as $k => $v) $body .= str_pad($k . ':', 12) . ($v !== '' ? $v : '-') . "\n";
$body .= "\nMessage:\n" . $message . "\n\n";
$body .= 'Attachments: ' . count($attachments) . "\nIP: $ip\nSent: " . date('D j M Y, g:ia') . "\n";

$boundary = 'at_' . bin2hex(random_bytes(12));
$headers = [
    'From: Alfa Triton Website <' . FROM_EMAIL . '>',
    'Reply-To: ' . $data['Name'] . ' <' . $data['Email'] . '>',
    'MIME-Version: 1.0',
    'Content-Type: multipart/mixed; boundary="' . $boundary . '"',
];
if ($urgent) { $headers[] = 'X-Priority: 1'; $headers[] = 'Importance: High'; }

$mime = "--$boundary\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 8bit\r\n\r\n" . $body . "\r\n";
foreach ($attachments as $a) {
    $mime .= "--$boundary\r\nContent-Type: {$a['mime']}; name=\"{$a['name']}\"\r\n"
           . "Content-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"{$a['name']}\"\r\n\r\n"
           . chunk_split(base64_encode($a['data'])) . "\r\n";
}
$mime .= "--$boundary--";

$sent = @mail(TO_EMAIL, '=?UTF-8?B?' . base64_encode($subject) . '?=', $mime, implode("\r\n", $headers), '-f' . FROM_EMAIL);
if (!$sent) respond(false, 'Sorry, we could not send your enquiry.', 500);
respond(true);
