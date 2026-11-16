const { randomBytes, scryptSync } = require("node:crypto");
const readline = require("node:readline");
if (!process.stdin.isTTY) {
  console.error("Jalankan lewat terminal interaktif: npm run admin:hash");
  process.exit(1);
}
process.stdout.write("Password admin (akan tampil sebagai bintang): ");
const stdin = process.stdin;
stdin.setRawMode(true);
stdin.resume();
stdin.setEncoding("utf8");
let pass = "";
stdin.on("data", function listener(key) {
  if (key === "\u0003") {
    process.stdout.write("\n");
    process.exit(130);
  }
  if (key === "\r" || key === "\n") {
    stdin.setRawMode(false);
    stdin.pause();
    stdin.removeListener("data", listener);
    process.stdout.write("\n");
    if (pass.length < 12) {
      console.error("Gunakan password minimal 12 karakter.");
      process.exit(1);
    }
    const salt = randomBytes(24).toString("hex");
    const hash = scryptSync(pass, salt, 64, {
      maxmem: 64 * 1024 * 1024,
    }).toString("hex");
    pass = "";
    console.log("WEJI_ADMIN_PASSWORD_HASH=" + salt + ":" + hash);
    console.log("Simpan hash di .env.local; jangan simpan password plaintext.");
    return;
  }
  if (key === "\u007f" || key === "\b") {
    if (pass.length) {
      pass = pass.slice(0, -1);
      process.stdout.write("\b \b");
    }
    return;
  }
  if (pass.length < 256 && key >= " ") {
    pass += key;
    process.stdout.write("*");
  }
});
