import { Address } from '@/api/entity/Address';
import { PropertyRequirement } from '@/api/entity/PropertyRequirement';
import { UserAuth } from '@/api/entity/UserAuth';
import { AppDataSource } from '@/server';
import { Request, Response } from 'express';

export const requireMents = async (req: Request, res: Response) => {
    try {
        // Extracting the body from the request
        const { 
            userId, 
            registeredId,
            state, 
            city, 
            locality, 
            minBudget, 
            maxBugdget, 
            category, 
            subCategory, 
            bhks, 
            furnishing, 
            isSale, 
            bhkRequired, 
            landArea
        } = req.body;

        const requirementRepo = AppDataSource.getRepository(PropertyRequirement);
        const addressRepo = AppDataSource.getRepository(Address);
        const userRepo = AppDataSource.getRepository(UserAuth); 
        const user = await userRepo.findOne({
            where: { id: userId }
        });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }

        // Check if requirement already exists
        if (userId && registeredId) {
            const existingRequirement = await requirementRepo.findOne({
                where: { id: registeredId },
                relations: ['addressId']
            });

            if (!existingRequirement) {
                return res.status(400).json({ message: 'Post Requirement not found' });
            }

            // Update the existing requirement's address
            if (existingRequirement.addressId) {
                existingRequirement.addressId.state = state;
                existingRequirement.addressId.city = city;
                existingRequirement.addressId.locality = locality;
                await addressRepo.save(existingRequirement.addressId);
            }

            // Update requirement with the new data
            Object.assign(existingRequirement, {
                minBudget,
                maxBugdget,
                category,
                subCategory,
                bhks,
                furnishing,
                isSale,
                bhkRequired,
                landArea
            });

            const updatedRequirement = await requirementRepo.save(existingRequirement);
            return res.status(200).json({ 
                message: 'Requirement updated successfully', 
                data: updatedRequirement 
            });
        }

        // Creating a new requirement if it doesn't exist
        const newAddress = addressRepo.create({
            state,
            city,
            locality
        });
        await addressRepo.save(newAddress);

        const newPostRequirement = requirementRepo.create({
            userId,
            minBudget,
            maxBugdget,
            category,
            subCategory,
            bhks,
            furnishing,
            isSale,
            bhkRequired,
            landArea,
            addressId: newAddress
        });

        const savedRequirement = await requirementRepo.save(newPostRequirement);

        // Sending a success response
        res.status(200).json({ 
            message: "Requirements processed successfully", 
            data: savedRequirement 
        });
    } catch (error) {
        // Handling any errors that occur during processing
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ 
            message: "An error occurred", 
            error: errorMessage
        });
    }
};


// get requirement 
export const getUserRequirements = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body

        const requirementRepo = AppDataSource.getRepository(PropertyRequirement);
        const userRepo = AppDataSource.getRepository(UserAuth);
        const user = await userRepo.findOne({
            where: { id: userId }
        });

        if (!user) {
            return res.status(400).json({ message: 'User not found' });
        }
        
        const properties = await requirementRepo.find({
            where: { userId }
        });
        
        if (properties.length === 0) {
            return res.status(400).json({ message: "No Property Found" });
        }
        
        res.status(200).json({ message: "Property Found", data: properties });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "server error";
        res.status(500).json({
            message: "An error occurred",
            error: errorMessage
        });
    }
}