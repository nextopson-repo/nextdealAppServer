
import { Address } from '@/api/entity/Address';
import { PostRequirement } from '@/api/entity/PropertyRequirement';
import { AppDataSource } from '@/server';
import { Request, Response } from 'express';

export const requireMents =async (req:Request, res:Response) =>{
    try {
        // Extracting the body from the request
        const  {userId, postId,state,city, locality,minBudget, maxBudget, category, subCategory, bhks, furnishing, isSale, bhkRequired, landArea, mobileNumber} = req.body;

        const requirementRepo = AppDataSource.getRepository(PostRequirement);
        const addressRepo = AppDataSource.getRepository(Address);

        // check if requirement already exists

        if(userId && postId){
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
         

        // // Creating a new requirement if it doesn't exist
         const newAddress = addressRepo.create({
            state: state,
            city: city,
            locality: locality,
         });
         await addressRepo.save(newAddress);
         
         const newPostRequirement = requirementRepo.create({
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

