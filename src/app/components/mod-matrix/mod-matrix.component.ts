import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { ConnectParams, Defaults, EndpointOptions, jsPlumb, jsPlumbInstance } from 'jsplumb';
import { Patch } from 'src/app/interfaces/patch';

@Component({
  selector: 'mod-matrix',
  templateUrl: './mod-matrix.component.html',
  styleUrls: ['./mod-matrix.component.scss']
})
export class ModMatrixComponent implements OnInit, OnDestroy {
  @Input() patch!: Patch;
  @Output() newValueEvent = new EventEmitter<Patch>();
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
    })

    let mod1 = this.jsPlumbInstance.addEndpoint("mod-env", this.endpointOptions)
    let mod2 = this.jsPlumbInstance.addEndpoint("mod-lfo", this.endpointOptions)
    let mod3 = this.jsPlumbInstance.addEndpoint("mod-metal", this.endpointOptions)
    let mod4 = this.jsPlumbInstance.addEndpoint("mod-pitch", this.endpointOptions)
    let mod5 = this.jsPlumbInstance.addEndpoint("mod-saw", this.endpointOptions)
    let mod6 = this.jsPlumbInstance.addEndpoint("mod-filter", this.endpointOptions)
    let mod7 = this.jsPlumbInstance.addEndpoint("mod-sub", this.endpointOptions)
    let mod8 = this.jsPlumbInstance.addEndpoint("mod-pwm", this.endpointOptions);

    let connectionList = this.patch.modmatrix;
    for (let key in connectionList) {
      let selectedConnection = connectionList[key];
      connections[key] = {};
      connections[key]['source'] = selectedConnection.source;
      connections[key]['target'] = selectedConnection.target;
      let connectParam: ConnectParams = {
        source: selectedConnection.source, 
        target: selectedConnection.target
      };
      this.jsPlumbInstance.connect(connectParam);
    }
    this.modInput = JSON.stringify(connections);
    console.log(this.modInput);


  }

  ngOnDestroy(): void {
    this.jsPlumbInstance.cleanupListeners();
  }

  updateInfo(metaInfo: any) {
    if (this.patch) {
      this.patch[metaInfo.field] = metaInfo.value;
    }
    this.newValueEvent.emit(this.patch);
  }

}
