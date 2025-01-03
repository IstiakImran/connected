// /app/api/auth/register/route.js

import { dbConnect } from '@/lib/dbConnect';

import { hashPassword, encryptData } from '@/lib/auth';
import { NextResponse } from 'next/server';
import { User } from '@/schema/User';

export async function POST(request) {
    try {
        const { username, email, password, fullName, address } = await request.json();

        // Validate input
        if (!username || !email || !password || !fullName || !address) {
            return NextResponse.json(
                { message: 'All fields are required.' },
                { status: 400 }
            );
        }

        await dbConnect();

        // Check if user exists
        const existingUser = await User.findOne({
            $or: [{ email: encryptData(email) }, { username: encryptData(username) }],
        });

        if (existingUser) {
            return NextResponse.json(
                { message: 'User already exists.' },
                { status: 400 }
            );
        }

        // Hash password
        const hashedPassword = await hashPassword(password);

        // Encrypt user data
        const encryptedUsername = encryptData(username);
        const encryptedEmail = encryptData(email);
        const encryptedfullName = encryptData(fullName);
        const encryptedaddress = encryptData(address);

        // Create user
        await User.create({
            username: encryptedUsername,
            email: encryptedEmail,
            password: hashedPassword,
            fullName: encryptedfullName,
            address: encryptedaddress,
        });

        return NextResponse.json(
            { message: 'User registered successfully.' },
            { status: 201 }
        );
    } catch (error) {
        console.error('Registration Error:', error);
        return NextResponse.json(
            { message: 'Internal Server Error.' },
            { status: 500 }
        );
    }
}
