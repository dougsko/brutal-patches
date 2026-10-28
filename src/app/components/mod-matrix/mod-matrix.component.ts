import { Component, Input, OnDestroy, OnInit } from '@angular/core';
import { Defaults, EndpointOptions, jsPlumb, jsPlumbInstance } from 'jsplumb';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'mod-matrix',
  templateUrl: './mod-matrix.component.html',
  styleUrls: ['./mod-matrix.component.scss']
})
export class ModMatrixComponent implements OnInit, OnDestroy {
  @Input() patch!: Patch;
  endpointOptions: EndpointOptions = { isSource: true, isTarget: true, paintStyle: { fill: "transparent" }, maxConnections: 3 };
  jsPlumbInstance!: jsPlumbInstance;
  modInput!: string;

  constructor() { }

  ngOnInit(): void {
    let defaults: Defaults = {};
    let connections: any = [];

    defaults.Endpoint = "Dot";
    defaults.EndpointStyle = { fill: "transparent" };
    defaults.Anchor = [.51, .49, 0, 0];
    defaults.PaintStyle = { strokeWidth: 3, stroke: "#ffa500" };
    defaults.Connector = ["Bezier", { curviness: 25 }];
    this.jsPlumbInstance = jsPlumb.getInstance(defaults);

    this.jsPlumbInstance.bind("click", (conn) => {
      this.jsPlumbInstance.deleteConnection(conn);
    });

    this.jsPlumbInstance.bind("connection", (conn) => {
      this.doConnections();
    });

    this.jsPlumbInstance.addEndpoint("mod-env", this.endpointOptions)
    this.jsPlumbInstance.addEndpoint("mod-lfo", this.endpointOptions)
    this.jsPlumbInstance.addEndpoint("mod-metal", this.endpointOptions)
    this.jsPlumbInstance.addEndpoint("mod-pitch", this.endpointOptions)
    this.jsPlumbInstance.addEndpoint("mod-saw", this.endpointOptions)
    this.jsPlumbInstance.addEndpoint("mod-filter", this.endpointOptions)
    this.jsPlumbInstance.addEndpoint("mod-sub", this.endpointOptions)
    this.jsPlumbInstance.addEndpoint("mod-pwm", this.endpointOptions);

    let connectionList = this.patch.modmatrix;
    for (let key in connectionList) {
      let selectedConnection = connectionList[key];
      connections[key] = {};
      connections[key]['source'] = selectedConnection.source;
      connections[key]['target'] = selectedConnection.target;
      this.jsPlumbInstance.connect({source: selectedConnection.source, target: selectedConnection.target});
    }
    this.modInput = JSON.stringify(connections);
  }

  ngOnDestroy(): void {
    this.jsPlumbInstance.cleanupListeners();
  }

  doConnections(initial?: any) {
    let connectionList: any  = this.patch.modmatrix;
    if(!initial) {
      connectionList = this.jsPlumbInstance.getAllConnections();
    }
    let connections: any = [];
    for(var key in connectionList) {
        var selectedConnection = connectionList[key];
        connections[key]={};
        connections[key]['source'] = selectedConnection.sourceId;
        connections[key]['target'] = selectedConnection.targetId;
    }
    let modString = JSON.stringify(connections);
    this.modInput = modString;
    this.patch.modmatrix = connections;
  }

}
