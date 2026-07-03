export interface Customer {

  id:string;

  firstName:string;

  lastName:string;

  email:string;

  phone:string;

  avatar?:string;

  wishlist:number[];

  cart:number[];

  recentlyViewed:number[];

  addresses:string[];

  loyaltyPoints:number;

  lifetimeValue:number;

  totalOrders:number;

  averageOrderValue:number;

  preferredCategory:string[];

  preferredColour:string[];

  preferredOccasion:string[];

  preferredSize:string[];

  createdAt:string;

}