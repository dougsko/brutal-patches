import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
// Shared Admin Material Module
import { AdminMaterialModule } from '../../shared/admin-material.module';

// Additional Material Modules not covered by shared module
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressBarModule } from '@angular/material/progress-bar';

// Components
import { DashboardComponent } from '../../components/dashboard/dashboard.component';
import { SystemHealthComponent } from '../../components/system-health/system-health.component';
import { StatsCardComponent } from '../../components/stats-card/stats-card.component';
import { BaseChartComponent } from '../../components/charts/base-chart.component';
import { LineChartComponent } from '../../components/charts/line-chart.component';
import { BarChartComponent } from '../../components/charts/bar-chart.component';
import { PieChartComponent } from '../../components/charts/pie-chart.component';
import { DonutChartComponent } from '../../components/charts/donut-chart.component';

@NgModule({
  declarations: [
    DashboardComponent,
    SystemHealthComponent,
    StatsCardComponent,
    BaseChartComponent,
    LineChartComponent,
    BarChartComponent,
    PieChartComponent,
    DonutChartComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    
    // Shared Material Modules
    AdminMaterialModule,
    
    // Additional specific Material Modules
    MatSlideToggleModule,
    MatProgressBarModule,
    RouterModule.forChild([
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { path: 'overview', component: DashboardComponent },
      { path: 'health', component: SystemHealthComponent }
    ])
  ],
  exports: [
    // Export chart components for use in analytics module
    BaseChartComponent,
    LineChartComponent,
    BarChartComponent,
    PieChartComponent,
    DonutChartComponent
  ]
})
export class DashboardModule { }