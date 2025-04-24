
import { Address } from '@/api/entity/Address';
import { AppDataSource } from '@/server';
import { Request, Response } from 'express';

export const requireMents =async (req:Request, res:Response) =>{
    try {
        // Extracting the body from the request
        const  {addressId, userId, postId,state,city, locality,minBudget, maxBudget, category, subCategory, bhks, furnishing, isSale, bhkRequired, landArea, mobileNumber} = req.body;

        const requirementRepo = AppDataSource.getRepository('PropertyRequirement');
        const addressRepo = AppDataSource.getRepository('Address');

        // check if requirement already exists

        if(userId || addressId || postId){
            const existingRequirement = await requirementRepo.findOne({
                where:{id: postId},
                relations: ['addressId']
            })

            if(!existingRequirement){
                return res.status(400).json({message: 'Post Requirement not found'})   
            }

            // Update the existing requirement  with the new  Data
            if(existingRequirement.addressId){
                existingRequirement.addressId.state = state;
                existingRequirement.addressId.city = city;
                existingRequirement.addressId.locality = locality;
                await addressRepo.save(existingRequirement.addressId);

            }


            // update requirement with the new data
            Object.assign(existingRequirement, {
                userId,
                addressId,
                postId,
                minBudget,
                maxBudget,
                category,
                subCategory,
                bhks,
                furnishing,
                isSale,
                bhkRequired,
                landArea,
                mobileNumber
            });

            const updatedRequirement = await requirementRepo.save(existingRequirement);
            return res.status(200).json({message: 'Requirement updated successfully', data: updatedRequirement});
        }
         

        // Creating a new requirement if it doesn't exist
         const newAddress = addressRepo.create({
            state: state,
            city: city,
            locality: locality,
         });
         await addressRepo.save(newAddress);
         
         const newPostRequirement = requirementRepo.create({
            userId,
            addressId: newAddress.id,
            postId,
            minBudget,
            maxBudget,
            category,
            subCategory,
            bhks,
            furnishing,
            isSale,
            bhkRequired,
            landArea,
            mobileNumber
         });

         const savedRequirement = await requirementRepo.save(newPostRequirement);


        // Sending a success response
        res.status(200).json({ message: "Requirements processed successfully", data: savedRequirement });
    } catch (error) {
        // Handling any errors that occur during processing
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        res.status(500).json({ message: "An error occurred", error: errorMessage });

        
    }


}

