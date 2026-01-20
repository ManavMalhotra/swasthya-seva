import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { verifyAuthToken, checkPatientAccess } from '@/lib/firebaseAdmin';
import { rateLimit } from '@/lib/rateLimit';

const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for') || 'anonymous';
        const limitResult = rateLimit(ip, { limit: 5, windowMs: 60000 });
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many uploads' }, { status: 429 });
        }

        const authResult = await verifyAuthToken(request);
        if (!authResult.valid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const formData = await request.formData();
        const file = formData.get('file') as File;
        const patientId = formData.get('patientId') as string;

        if (!file || !patientId) {
            return NextResponse.json({ error: 'Missing file or patientId' }, { status: 400 });
        }

        const accessResult = await checkPatientAccess(authResult.uid!, patientId);
        if (!accessResult.hasAccess) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
            return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
        }
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json({ error: 'File too large' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const dataUri = `data:${file.type};base64,${buffer.toString('base64')}`;

        const isImage = file.type.startsWith('image/');
        const isPdf = file.type === 'application/pdf';
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');

        // Extract the file extension
        const fileExtension = safeName.split('.').pop()?.toLowerCase() || '';

        // CRITICAL FIX: Handle public_id differently for images vs raw files
        let publicIdName: string;

        if (isImage) {
            // For images: Cloudinary manages the format, so strip extension
            publicIdName = safeName.replace(/\.[^/.]+$/, "");
        } else {
            // For raw files (PDFs, docs): Keep the extension in the public_id
            // This is REQUIRED for raw file URLs to work correctly
            publicIdName = safeName;
        }

        const uploadOptions = {
            folder: `swasthya-seva/reports/${patientId}`,
            public_id: `${timestamp}_${publicIdName}`,
            resource_type: isImage ? 'image' as const : 'raw' as const,
            type: 'authenticated' as const,
            // For PDFs, we can add these options for better handling
            ...(isPdf && {
                pages: true, // Extract page count for PDFs
            })
        };

        console.log('[Upload] Options:', JSON.stringify(uploadOptions, null, 2));

        const result = await cloudinary.uploader.upload(dataUri, uploadOptions);

        console.log('[Upload] Cloudinary result:', {
            public_id: result.public_id,
            resource_type: result.resource_type,
            format: result.format,
            version: result.version,
            bytes: result.bytes
        });

        return NextResponse.json({
            success: true,
            data: {
                publicId: result.public_id,
                resourceType: result.resource_type,
                version: result.version,
                // For raw files, format might not be returned, use file extension
                format: result.format || fileExtension,
                bytes: result.bytes,
                // Don't return secure_url for authenticated assets (it won't work directly)
            }
        });

    } catch (error: any) {
        console.error('[Upload] Error:', error);
        return NextResponse.json({
            error: 'Upload failed',
            details: error.message
        }, { status: 500 });
    }
}