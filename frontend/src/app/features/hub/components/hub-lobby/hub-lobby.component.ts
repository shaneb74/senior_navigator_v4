import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MCIPService } from '../../../../core/services/mcip.service';
import { MCIPState } from '../../../../shared/models/contracts';

interface ProductCard {
  id: 'gcp' | 'cost_planner' | 'pfma';
  title: string;
  description: string;
  icon: string;
  route: string;
  completed: boolean;
  locked: boolean;
}

@Component({
  selector: 'app-hub-lobby',
  templateUrl: './hub-lobby.component.html',
  styleUrls: ['./hub-lobby.component.scss'],
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatChipsModule
  ]
})
export class HubLobbyComponent implements OnInit {
  mcipState$: Observable<MCIPState>;
  products: ProductCard[] = [];
  overallProgress = 0;

  constructor(
    private mcipService: MCIPService,
    private router: Router
  ) {
    this.mcipState$ = this.mcipService.getState();
  }

  ngOnInit(): void {
    this.mcipState$.subscribe(state => {
      this.updateProductCards(state);
      this.overallProgress = this.mcipService.getCompletionPercentage();
    });
  }

  private updateProductCards(state: MCIPState): void {
    this.products = [
      {
        id: 'gcp',
        title: 'Find the Right Care',
        description: 'Get a personalized care recommendation based on needs, safety, and lifestyle.',
        icon: 'health_and_safety',
        route: '/gcp',
        completed: state.products.gcp.completed,
        locked: false  // Always accessible
      },
      {
        id: 'cost_planner',
        title: 'Plan Care Costs',
        description: 'Estimate monthly costs and explore financial options for senior care.',
        icon: 'account_balance',
        route: '/cost-planner',
        completed: state.products.cost_planner.completed,
        locked: !this.mcipService.canAccessProduct('cost_planner')
      },
      {
        id: 'pfma',
        title: 'Financial Fit Check',
        description: 'See if care is affordable and discover assistance programs.',
        icon: 'payments',
        route: '/pfma',
        completed: state.products.pfma.completed,
        locked: !this.mcipService.canAccessProduct('pfma')
      }
    ];
  }

  navigateToProduct(product: ProductCard): void {
    if (product.locked) {
      return;
    }
    this.router.navigate([product.route]);
  }

  resetProgress(): void {
    if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
      this.mcipService.reset();
    }
  }

  getStatusLabel(product: ProductCard): string {
    if (product.completed) return 'Completed';
    if (product.locked) return 'Locked';
    return 'Start';
  }

  getStatusIcon(product: ProductCard): string {
    if (product.completed) return 'check_circle';
    if (product.locked) return 'lock';
    return 'arrow_forward';
  }

  getNextProductTitle(): string {
    const nextProduct = this.mcipService.getNextProduct();
    if (!nextProduct) return 'All Complete!';
    
    const product = this.products.find(p => p.id === nextProduct);
    return product ? product.title : 'Continue';
  }
}
