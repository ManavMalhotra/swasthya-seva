import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dl4opqkxq';
const apiKey = process.env.CLOUDINARY_API_KEY || '212182323211821';
const apiSecret = process.env.CLOUDINARY_API_SECRET;

// Log configuration status (without exposing secrets)
console.log('[Cloudinary] Configuration:', {
    cloud_name: cloudName,
    api_key: apiKey ? `${apiKey.substring(0, 4)}...` : 'NOT SET',
    api_secret: apiSecret ? 'SET (hidden)' : 'NOT SET - SIGNATURES WILL FAIL!'
});

cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
});

export default cloudinary;
