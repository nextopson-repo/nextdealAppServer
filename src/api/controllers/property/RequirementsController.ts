import { Address } from '@/api/entity/Address';
import { PropertyRequirement } from '@/api/entity/PropertyRequirement';
import { UserAuth } from '@/api/entity/UserAuth';
import { AppDataSource } from '@/server';
import { Request, Response } from 'express';
import { RequirementEnquiry } from '../../entity/RequirementEnquiry';

export const CreateOrUpdateRequirement = async (req: Request, res: Response) => {
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


// get requirement list
export const getUserRequirements = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        const { page = 1, limit = 10 } = req.query;
        const skip = (Number(page) - 1) * Number(limit);

        if (!userId) {
            return res.status(400).json({ 
                success: false,
                message: 'User ID is required' 
            });
        }

        const requirementRepo = AppDataSource.getRepository(PropertyRequirement);
        const userRepo = AppDataSource.getRepository(UserAuth);
        const requirementEnquiryRepo = AppDataSource.getRepository(RequirementEnquiry);

        // Validate user exists
        const user = await userRepo.findOne({
            where: { id: userId }
        });

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }
        
        // Get total count with error handling
        let totalCount = 0;
        try {
            totalCount = await requirementRepo.count({
                where: { userId }
            });
        } catch (countError) {
            console.error('Error counting requirements:', countError);
            return res.status(500).json({ 
                success: false,
                message: 'Error counting requirements',
                error: countError instanceof Error ? countError.message : 'Unknown error'
            });
        }

        // Get requirements with error handling
        let requirements = [];
        try {
            requirements = await requirementRepo.find({
                where: { userId },
                relations: ['addressId', 'enquiries'],
                order: { createdAt: 'DESC' },
                skip,
                take: Number(limit)
            });
        } catch (findError) {
            console.error('Error finding requirements:', findError);
            return res.status(500).json({ 
                success: false,
                message: 'Error fetching requirements',
                error: findError instanceof Error ? findError.message : 'Unknown error'
            });
        }
        
        if (requirements.length === 0) {
            return res.status(200).json({ 
                success: true,
                message: "No requirements found",
                requirements: [],
                totalCount: 0,
                currentPage: Number(page),
                totalPages: 0,
                hasMore: false
            });
        }

        // Process requirements with error handling
        try {
            const requirementsWithDetails = await Promise.all(requirements.map(async (requirement) => {
                // Get enquiries for this requirement
                const enquiries = await requirementEnquiryRepo.find({
                    where: { requirementId: requirement.id },
                    relations: ['user']
                });

                // Format budget
                const formatBudget = (min: string, max: string) => {
                    const formatAmount = (amount: string) => {
                        const num = parseFloat(amount);
                        if (num >= 10000000) return `${(num / 10000000).toFixed(0)} Cr`;
                        if (num >= 100000) return `${(num / 100000).toFixed(0)} L`;
                        if (num >= 1000) return `${(num / 1000).toFixed(0)} K`;
                        return amount;
                    };
                    
                    if (min && max) {
                        return `${formatAmount(min)} - ${formatAmount(max)}`;
                    }
                    return 'Budget not specified';
                };

                // Format area requirements
                const formatAreaRequirements = (requirement: PropertyRequirement) => {
                    const areas = [];
                    if (requirement.landArea) {
                        areas.push(`${requirement.landArea} sq.ft Land Area`);
                    }
                    if (requirement.plotArea) {
                        areas.push(`${requirement.plotArea} sq.ft Plot Area`);
                    }
                    return areas;
                };

                // Build additional requirements array
                const additionalRequirements = [];
                
                // Sale/Rent preference
                if (requirement.isSale !== undefined) {
                    additionalRequirements.push(requirement.isSale ? 'For Sale' : 'For Rent');
                }

                // Area requirements
                const areaReqs = formatAreaRequirements(requirement);
                additionalRequirements.push(...areaReqs);

                // Furnishing
                if (requirement.furnishing) {
                    additionalRequirements.push(requirement.furnishing);
                }

                // BHK requirements
                if (requirement.bhks) {
                    additionalRequirements.push(`${requirement.bhks} BHK`);
                } else if (requirement.bhkRequired) {
                    additionalRequirements.push(requirement.bhkRequired);
                }

                // Calculate engagement stats
                const viewCount = enquiries.length * 1000;
                const interactionCount = enquiries.length * 50;

                const formatCount = (count: number) => {
                    if (count >= 1000000) return `${(count / 1000000).toFixed(1)} M`;
                    if (count >= 1000) return `${(count / 1000).toFixed(0)} K`;
                    return count.toString();
                };

                return {
                    id: requirement.id,
                    needOf: requirement.subCategory || requirement.category,
                    location: requirement.addressId ? 
                        `${requirement.addressId.city}, ${requirement.addressId.state}` : 
                        'Location not specified',
                    additionalRequirements,
                    budget: formatBudget(requirement.minBudget, requirement.maxBugdget),
                    category: requirement.category,
                    subCategory: requirement.subCategory,
                    isSale: requirement.isSale,
                    bhks: requirement.bhks,
                    furnishing: requirement.furnishing,
                    landArea: requirement.landArea,
                    plotArea: requirement.plotArea,
                    address: requirement.addressId ? {
                        city: requirement.addressId.city,
                        state: requirement.addressId.state
                    } : null,
                    enquiries: {
                        count: enquiries.length,
                        details: enquiries.map(enquiry => ({
                            id: enquiry.id,
                            userId: enquiry.userId,
                            message: enquiry.message,
                            createdAt: enquiry.createdAt,
                            user: enquiry.user ? {
                                name: enquiry.user.fullName,
                                email: enquiry.user.email
                            } : null
                        }))
                    },
                    stats: {
                        views: `${formatCount(viewCount)}`,
                        interactions: `${formatCount(interactionCount)}`
                    },
                    createdAt: requirement.createdAt,
                    updatedAt: requirement.updatedAt
                };
            }));

            const totalPages = Math.ceil(totalCount / Number(limit));
            
            return res.status(200).json({ 
                success: true,
                message: "Requirements retrieved successfully", 
                requirements: requirementsWithDetails,
                totalCount,
                currentPage: Number(page),
                totalPages,
                hasMore: skip + requirements.length < totalCount
            });
        } catch (processError) {
            console.error('Error processing requirements:', processError);
            return res.status(500).json({
                success: false,
                message: "Error processing requirements",
                error: processError instanceof Error ? processError.message : 'Unknown error'
            });
        }
    } catch (error) {
        console.error('Error in getUserRequirements:', error);
        return res.status(500).json({
            success: false,
            message: "An error occurred",
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// Create User Requirements Enquiry
export const createUserRequirementsEnquiry = async (req: Request, res: Response) => {
    try {
        const { userId, requirementId, message } = req.body;
        if (!userId || !requirementId) {
            return res.status(400).json({ message: 'userId and requirementId are required' });
        }
        const userRepo = AppDataSource.getRepository(UserAuth);
        const requirementRepo = AppDataSource.getRepository(PropertyRequirement);
        const enquiryRepo = AppDataSource.getRepository(RequirementEnquiry);

        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const requirement = await requirementRepo.findOne({ where: { id: requirementId } });
        if (!requirement) return res.status(400).json({ message: 'Requirement not found' });

        // Create and save the enquiry
        const newEnquiry = enquiryRepo.create({ userId, requirementId, message });
        const savedEnquiry = await enquiryRepo.save(newEnquiry);

        // Update the requirement's enquiryIds array
        let enquiryIds = requirement.enquiryIds || [];
        if (!enquiryIds.includes(savedEnquiry.id)) {
            enquiryIds.push(savedEnquiry.id);
            requirement.enquiryIds = enquiryIds;
            await requirementRepo.save(requirement);
        }

        return res.status(201).json({ message: 'Requirement enquiry created', data: savedEnquiry });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: 'An error occurred', error: errorMessage });
    }
};

// Get User Requirements Enquiries
export const getUserRequirementsEnquiry = async (req: Request, res: Response) => {
    try {
        const { userId } = req.body;
        if (!userId) {
            return res.status(400).json({ message: 'userId is required' });
        }

        const userRepo = AppDataSource.getRepository(UserAuth);
        const enquiryRepo = AppDataSource.getRepository(RequirementEnquiry);
        const requirementRepo = AppDataSource.getRepository(PropertyRequirement);

        // S3 base URL for profile images
        const S3_BUCKET = process.env.AWS_S3_BUCKET || 'nextdealapp';
        const S3_REGION = process.env.AWS_REGION || 'us-east-1';
        const S3_BASE_URL = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/`;

        // Get all enquiries for this user, including the related requirement and user details
        const enquiries = await enquiryRepo.find({
            where: { userId },
            relations: ['requirement', 'requirement.addressId'],
            order: { createdAt: 'DESC' }
        });

        // Helper functions for formatting
        const formatBudget = (min: string, max: string) => {
            const formatAmount = (amount: string) => {
                const num = parseFloat(amount);
                if (num >= 10000000) return `${(num / 10000000).toFixed(0)} Cr`;
                if (num >= 100000) return `${(num / 100000).toFixed(0)} L`;
                if (num >= 1000) return `${(num / 1000).toFixed(0)} K`;
                return amount;
            };
            if (min && max) {
                return `${formatAmount(min)} - ${formatAmount(max)}`;
            }
            return 'Budget not specified';
        };

        const formatArea = (requirement: any) => {
            if (requirement.landArea && requirement.plotArea) {
                return `${requirement.landArea} - ${requirement.plotArea} sq.ft Area`;
            }
            if (requirement.landArea) {
                return `${requirement.landArea} sq.ft Area`;
            }
            if (requirement.plotArea) {
                return `${requirement.plotArea} sq.ft Area`;
            }
            return null;
        };

        const formatAdditionalRequirements = (requirement: any) => {
            const arr = [];
            if (requirement.isSale !== undefined) arr.push(requirement.isSale ? 'For Sale' : 'For Rent');
            const area = formatArea(requirement);
            if (area) arr.push(area);
            if (requirement.furnishing) arr.push(requirement.furnishing);
            if (requirement.bhks) arr.push(`${requirement.bhks} BHK`);
            else if (requirement.bhkRequired) arr.push(requirement.bhkRequired);
            return arr;
        };

        // For each enquiry, fetch the agent (requirement poster) info
        const formatted = await Promise.all(enquiries.map(async (enquiry) => {
            const req = enquiry.requirement;
            let agent = null;
            if (req && req.userId) {
                agent = await userRepo.findOne({ where: { id: req.userId } });
            }
            return {
                agent: {
                    name: agent?.fullName || '',
                    image: agent?.userProfileKey ? `${S3_BASE_URL}${agent.userProfileKey}` : "https://randomuser.me/api/portraits/men/1.jpg",
                    role: agent?.userType || 'Agent',
                    timeAgo: req.createdAt,
                    mobileNumber: agent?.mobileNumber,
                    email: agent?.email
                },
                needOf: req?.subCategory || req?.category || '',
                location: req?.addressId ? `${req.addressId.city}, ${req.addressId.state}` : '',
                additionalRequirements: formatAdditionalRequirements(req),
                budget: formatBudget(req?.minBudget, req?.maxBugdget),
                createdAt: enquiry.createdAt,
            };
        }));

        return res.status(200).json({
            message: 'Requirement enquiries found',
            data: formatted,
            count: formatted.length
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: 'An error occurred', error: errorMessage });
    }
};

// Get enquiries for a specific requirement (new function)
export const getRequirementEnquiries = async (req: Request, res: Response) => {
    try {
        const { requirementId } = req.body;
        if (!requirementId) {
            return res.status(400).json({ message: 'requirementId is required' });
        }
        
        const requirementRepo = AppDataSource.getRepository(PropertyRequirement);
        const enquiryRepo = AppDataSource.getRepository(RequirementEnquiry);
        
        // Check if requirement exists
        const requirement = await requirementRepo.findOne({ where: { id: requirementId } });
        if (!requirement) {
            return res.status(404).json({ message: 'Requirement not found' });
        }
        
        // Get all enquiries for this requirement
        const enquiries = await enquiryRepo.find({ 
            where: { requirementId }, 
            relations: ['user'],
            order: { createdAt: 'DESC' }
        });
        
        return res.status(200).json({ 
            message: 'Enquiries for requirement found', 
            data: enquiries,
            count: enquiries.length 
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: 'An error occurred', error: errorMessage });
    }
};

// delete user requirements enquiry
export const deleteUserRequirementsEnquiry = async (req: Request, res: Response) => {
    try {
        const { userId, enquiryId } = req.body;
        if (!userId || !enquiryId) {
            return res.status(400).json({ message: 'userId and enquiryId are required' });
        }
        
        const userRepo = AppDataSource.getRepository(UserAuth);
        const enquiryRepo = AppDataSource.getRepository(RequirementEnquiry);
        const requirementRepo = AppDataSource.getRepository(PropertyRequirement);
        
        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        // Find the enquiry
        const enquiry = await enquiryRepo.findOne({ where: { id: enquiryId } });
        if (!enquiry) {
            return res.status(404).json({ message: 'Enquiry not found' });
        }
        
        // Only allow delete if admin or owner
        if (!user.isAdmin && enquiry.userId !== userId) {
            return res.status(403).json({ message: 'Not authorized to delete this enquiry' });
        }
        
        // Remove the enquiry from the requirement's enquiryIds array (for backward compatibility)
        const requirement = await requirementRepo.findOne({ where: { id: enquiry.requirementId } });
        if (requirement && requirement.enquiryIds) {
            requirement.enquiryIds = requirement.enquiryIds.filter((id: string) => id !== enquiryId);
            await requirementRepo.save(requirement);
        }
        
        await enquiryRepo.delete(enquiryId);
        return res.status(200).json({ message: 'Enquiry deleted successfully' });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: 'An error occurred', error: errorMessage });
    }
};

export const createRequirementEnquiry = async (req: Request, res: Response) => {
    try {
        const { userId, requirementId } = req.body;
        if (!userId || !requirementId) {
            return res.status(400).json({ message: 'userId and requirementId are required' });
        }
        const userRepo = AppDataSource.getRepository(UserAuth);
        const requirementRepo = AppDataSource.getRepository(PropertyRequirement);
        const enquiryRepo = AppDataSource.getRepository(RequirementEnquiry);

        const user = await userRepo.findOne({ where: { id: userId } });
        if (!user) return res.status(400).json({ message: 'User not found' });

        const requirement = await requirementRepo.findOne({ where: { id: requirementId } });
        if (!requirement) return res.status(400).json({ message: 'Requirement not found' });

        // Create and save the enquiry
        const newEnquiry = enquiryRepo.create({ userId, requirementId });
        const savedEnquiry = await enquiryRepo.save(newEnquiry);

        // Optionally update the requirement's enquiryIds array
        let enquiryIds = requirement.enquiryIds || [];
        if (!enquiryIds.includes(savedEnquiry.id)) {
            enquiryIds.push(savedEnquiry.id);
            requirement.enquiryIds = enquiryIds;
            await requirementRepo.save(requirement);
        }

        return res.status(201).json({ message: 'Requirement enquiry created', data: savedEnquiry });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ message: 'An error occurred', error: errorMessage });
    }
};  

// update user requirements found status
export const updateUserRequirementsFoundStatus = async (req: Request, res: Response) => {
    try {
        const { userId, requirementId, isFound } = req.body;

        // Validate required fields
        if (!userId || !requirementId || isFound === undefined) {
            return res.status(400).json({ 
                success: false,
                message: 'userId, requirementId and isFound are required' 
            });
        }

        const userRepo = AppDataSource.getRepository(UserAuth);
        const requirementRepo = AppDataSource.getRepository(PropertyRequirement);

        // Validate user exists
        const user = await userRepo.findOne({ 
            where: { id: userId } 
        });

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Validate requirement exists
        const requirement = await requirementRepo.findOne({ 
            where: { id: requirementId } 
        });

        if (!requirement) {
            return res.status(404).json({ 
                success: false,
                message: 'Requirement not found' 
            });
        }

        // Validate ownership
        if (requirement.userId !== userId) {
            return res.status(403).json({ 
                success: false,
                message: 'Not authorized to update this requirement' 
            });
        }

        // Update requirement
        try {
            requirement.isFound = isFound;
            await requirementRepo.save(requirement);
            
            return res.status(200).json({ 
                success: true,
                message: 'Requirement found status updated successfully' 
            });
        } catch (updateError) {
            console.error('Error updating requirement:', updateError);
            return res.status(500).json({ 
                success: false,
                message: 'Error updating requirement',
                error: updateError instanceof Error ? updateError.message : 'Unknown error'
            });
        }
    } catch (error) {
        console.error('Error in updateUserRequirementsFoundStatus:', error);
        return res.status(500).json({ 
            success: false,
            message: 'An error occurred',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

// delete user requirements
export const deleteUserRequirements = async (req: Request, res: Response) => {
    try {
        const { userId, requirementId } = req.body;

        // Validate required fields
        if (!userId || !requirementId) {
            return res.status(400).json({ 
                success: false,
                message: 'userId and requirementId are required' 
            });
        }

        const userRepo = AppDataSource.getRepository(UserAuth);
        const requirementRepo = AppDataSource.getRepository(PropertyRequirement);

        // Validate user exists
        const user = await userRepo.findOne({ 
            where: { id: userId } 
        });

        if (!user) {
            return res.status(404).json({ 
                success: false,
                message: 'User not found' 
            });
        }

        // Validate requirement exists
        const requirement = await requirementRepo.findOne({ 
            where: { id: requirementId } 
        });

        if (!requirement) {
            return res.status(404).json({ 
                success: false,
                message: 'Requirement not found' 
            });
        }

        // Validate ownership
        if (requirement.userId !== userId) {
            return res.status(403).json({ 
                success: false,
                message: 'Not authorized to delete this requirement' 
            });
        }

        // Delete requirement
        try {
            await requirementRepo.delete(requirementId);
            return res.status(200).json({ 
                success: true,
                message: 'Requirement deleted successfully' 
            });
        } catch (deleteError) {
            console.error('Error deleting requirement:', deleteError);
            return res.status(500).json({ 
                success: false,
                message: 'Error deleting requirement',
                error: deleteError instanceof Error ? deleteError.message : 'Unknown error'
            });
        }
    } catch (error) {
        console.error('Error in deleteUserRequirements:', error);
        return res.status(500).json({ 
            success: false,
            message: 'An error occurred',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};