import webpush from 'web-push';

const { publicKey, privateKey } = webpush.generateVAPIDKeys();
console.log('\nAdd these to backend/.env:\n');
console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
console.log('\nAlso add the public key to the frontend .env:\n');
console.log(`VITE_VAPID_PUBLIC_KEY=${publicKey}\n`);
