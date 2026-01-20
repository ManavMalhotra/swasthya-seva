import { NextRequest, NextResponse } from 'next/server';
import cloudinary from '@/lib/cloudinary';
import { verifyAuthToken, checkPatientAccess } from '@/lib/firebaseAdmin';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
    try {
        const ip = request.headers.get('x-forwarded-for') || 'anonymous';
        const limitResult = rateLimit(ip, { limit: 20, windowMs: 60000 });
        if (!limitResult.success) {
            return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
        }

        const authResult = await verifyAuthToken(request);
        if (!authResult.valid) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { publicId, version, patientId, format, resourceType: bodyResourceType } = body;

        console.log('[SignedURL] Request:', { publicId, version, format, resourceType: bodyResourceType });

        if (!publicId) {
            return NextResponse.json({ error: 'Missing publicId' }, { status: 400 });
        }

        // Determine resource type - TRUST what was saved during upload
        let resourceType = bodyResourceType;

        // Fallback detection only if not provided
        if (!resourceType) {
            const ext = publicId.split('.').pop()?.toLowerCase() || '';
            const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'];

            if (imageExtensions.includes(ext)) {
                resourceType = 'image';
            } else {
                resourceType = 'raw';
            }
            console.log('[SignedURL] Detected resource type from extension:', resourceType);
        }

        // Patient access check
        const extractedPatientId = patientId || publicId.split('/')[2];
        if (extractedPatientId) {
            const accessResult = await checkPatientAccess(authResult.uid!, extractedPatientId);
            if (!accessResult.hasAccess) {
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        let signedUrl: string;

        // Build signed URL options - works for both image and raw resource types
        const options: Record<string, any> = {
            sign_url: true,
            type: 'authenticated',
            resource_type: resourceType,
            secure: true,
        };

        // CRITICAL: Add version for authenticated assets - this is REQUIRED for the signature to work
        if (version) {
            options.version = String(version);
        }

        // For images, add format if provided
        // For raw files, the format is already in the public_id (e.g., "file.pdf")
        if (resourceType === 'image' && format) {
            options.format = format;
        }

        console.log('[SignedURL] Options:', JSON.stringify(options, null, 2));

        // Generate the signed URL
        signedUrl = cloudinary.url(publicId, options);

        console.log('[SignedURL] Generated URL:', signedUrl);

        // For raw files with 401 issues, try using the Admin API approach
        // Check if URL looks valid or use alternative approach
        if (resourceType === 'raw' && version) {
            // Alternative: Build the URL manually with proper signature
            // The cloudinary.url() should work, but if it doesn't, this is a fallback
            try {
                // Try to get resource info and generate a new secure URL
                const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || 'dl4opqkxq';
                const apiSecret = process.env.CLOUDINARY_API_SECRET;

                if (apiSecret) {
                    // Generate a timestamp-based signature for the URL
                    const timestamp = Math.floor(Date.now() / 1000);
                    const expiresAt = timestamp + 3600; // 1 hour expiry

                    // For raw authenticated files, we can use the private_download_url utility
                    // This generates a time-limited URL for downloading authenticated assets
                    const downloadUrl = cloudinary.utils.private_download_url(
                        publicId,
                        format || '', // format
                        {
                            resource_type: 'raw',
                            type: 'authenticated',
                            expires_at: expiresAt,
                        }
                    );

                    if (downloadUrl && downloadUrl.includes('cloudinary')) {
                        console.log('[SignedURL] Using private_download_url for raw file:', downloadUrl);
                        signedUrl = downloadUrl;
                    }
                }
            } catch (fallbackError) {
                console.log('[SignedURL] Fallback approach failed, using standard URL:', fallbackError);
                // Continue with the standard signedUrl
            }
        }

        // Validate the URL was generated correctly
        if (!signedUrl || !signedUrl.includes('cloudinary')) {
            throw new Error('Invalid URL generated');
        }

        return NextResponse.json({
            success: true,
            url: signedUrl,
            resourceType, // Return for frontend use
        });

    } catch (error: any) {
        console.error('[SignedURL] Error:', error);
        return NextResponse.json({
            error: 'Failed to generate URL',
            details: error.message
        }, { status: 500 });
    }
}
