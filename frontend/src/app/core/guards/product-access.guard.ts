import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { MCIPService } from '../services/mcip.service';

/**
 * Product Access Guard
 * Checks if user can access a product based on MCIP prerequisites
 */
export const productAccessGuard: CanActivateFn = (route, state) => {
  const mcipService = inject(MCIPService);
  const router = inject(Router);

  // Extract product ID from route
  const productId = route.data['productId'] as string;

  if (!productId) {
    // No productId specified, allow access
    return true;
  }

  // Check if user can access this product
  const canAccess = mcipService.canAccessProduct(productId);

  if (!canAccess) {
    console.log(`[Product Access Guard] Access denied to ${productId}`);
    
    // Get the next recommended product
    const nextProduct = mcipService.getNextProduct();
    
    if (nextProduct) {
      // Redirect to the next product they should complete
      router.navigate([`/${nextProduct}`]);
    } else {
      // Redirect to hub if no clear next step
      router.navigate(['/hub']);
    }
    
    return false;
  }

  return true;
};
